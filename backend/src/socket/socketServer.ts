import type { Server, Socket } from "socket.io";
import { z, ZodError } from "zod";
import {
  createGame,
  fireShot,
  getGameForPlayer,
  getLiveGameIdsForPlayer,
  joinGame,
  leaveGame as leaveGameService,
  listLobbyGames,
  placeShips,
} from "../services/gameService";
import {
  createOrResumePlayer,
  getPlayerStats,
  updateLastSeen,
} from "../services/playerService";
import { clientEvents, gameRoom, playerRoom, serverEvents } from "./socketEvents";

declare module "socket.io" {
  interface SocketData {
    playerId?: number;
  }
}

const joinPlatformSchema = z.object({
  name: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  sessionToken: z.string().uuid().optional(),
}).refine((payload) => payload.name || payload.sessionToken, {
  message: "Name or session token is required",
});

const shipConfigItemSchema = z.object({
  size: z.number().int().min(1),
  count: z.number().int().min(1),
});

const createGameSchema = z.object({
  gridSize: z.number().int().min(6).max(15),
  shipConfig: z.array(shipConfigItemSchema).min(1),
  mode: z.enum(["pvp", "computer"]).optional().default("pvp"),
});

const joinGameSchema = z.object({
  gameId: z.number().int().positive(),
});

const cellSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

const placeShipsSchema = z.object({
  gameId: z.number().int().positive(),
  ships: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      size: z.number().int().min(1),
      cells: z.array(cellSchema).min(1),
    }),
  ),
});

const fireSchema = z.object({
  gameId: z.number().int().positive(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

const leaveGameSchema = z.object({
  gameId: z.number().int().positive(),
});

const requirePlayerId = (socket: Socket): number => {
  if (!socket.data.playerId) {
    throw new Error("Join the platform first");
  }

  return socket.data.playerId;
};

const errorMessage = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected server error";
};

const emitLobby = (io: Server): void => {
  io.emit(serverEvents.lobbyUpdated, { games: listLobbyGames() });
};

const restoreLiveGamesForSocket = (socket: Socket, playerId: number): void => {
  const liveGameIds = getLiveGameIdsForPlayer(playerId);

  for (const gameId of liveGameIds) {
    socket.join(gameRoom(gameId));
    socket.emit(serverEvents.gameUpdated, {
      game: getGameForPlayer(gameId, playerId),
    });
  }
};

const emitGameToRoom = async (io: Server, gameId: number): Promise<void> => {
  const roomSockets = await io.in(gameRoom(gameId)).fetchSockets();

  for (const roomSocket of roomSockets) {
    const playerId = roomSocket.data.playerId;

    if (!playerId) {
      continue;
    }

    try {
      const game = getGameForPlayer(gameId, playerId);
      roomSocket.emit(serverEvents.gameUpdated, { game });
    } catch (error) {
      roomSocket.emit(serverEvents.errorMessage, {
        message: errorMessage(error),
      });
    }
  }
};

const bind = (
  socket: Socket,
  eventName: string,
  handler: (payload: unknown) => void | Promise<void>,
): void => {
  socket.on(eventName, (payload: unknown) => {
    void (async () => {
      await handler(payload);
    })().catch((error) => {
      socket.emit(serverEvents.errorMessage, { message: errorMessage(error) });
    });
  });
};

export const registerSocketServer = (io: Server): void => {
  io.on("connection", (socket) => {
    bind(socket, clientEvents.joinPlatform, (payload) => {
      const input = joinPlatformSchema.parse(payload);
      const player = createOrResumePlayer(input.name, input.sessionToken);

      socket.data.playerId = player.id;
      socket.join(playerRoom(player.id));

      socket.emit(serverEvents.platformJoined, {
        player: {
          id: player.id,
          baseName: player.baseName,
          displayName: player.displayName,
        },
        sessionToken: player.sessionToken,
        stats: getPlayerStats(player.id),
        games: listLobbyGames(),
      });

      restoreLiveGamesForSocket(socket, player.id);
      emitLobby(io);
    });

    bind(socket, clientEvents.createGame, async (payload) => {
      const playerId = requirePlayerId(socket);
      const input = createGameSchema.parse(payload);
      const game = createGame(
        playerId,
        input.gridSize,
        input.shipConfig,
        input.mode,
      );

      socket.join(gameRoom(game.id));
      await emitGameToRoom(io, game.id);
      emitLobby(io);
    });

    bind(socket, clientEvents.joinGame, async (payload) => {
      const playerId = requirePlayerId(socket);
      const input = joinGameSchema.parse(payload);
      joinGame(input.gameId, playerId);

      socket.join(gameRoom(input.gameId));
      await emitGameToRoom(io, input.gameId);
      emitLobby(io);
    });

    bind(socket, clientEvents.placeShips, async (payload) => {
      const playerId = requirePlayerId(socket);
      const input = placeShipsSchema.parse(payload);
      placeShips(input.gameId, playerId, input.ships);

      socket.join(gameRoom(input.gameId));
      await emitGameToRoom(io, input.gameId);
    });

    bind(socket, clientEvents.fire, async (payload) => {
      const playerId = requirePlayerId(socket);
      const input = fireSchema.parse(payload);
      fireShot(input.gameId, playerId, input.x, input.y);

      await emitGameToRoom(io, input.gameId);
      emitLobby(io);
    });

    bind(socket, clientEvents.leaveGame, async (payload) => {
      const playerId = requirePlayerId(socket);
      const input = leaveGameSchema.parse(payload);
      const outcome = leaveGameService(input.gameId, playerId);

      if (outcome.kind === "forfeit") {
        await emitGameToRoom(io, input.gameId);
      }

      socket.leave(gameRoom(input.gameId));
      emitLobby(io);
    });

    socket.on("disconnect", () => {
      if (socket.data.playerId) {
        updateLastSeen(socket.data.playerId);
      }
    });
  });
};
