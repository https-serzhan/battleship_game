import { io as createClient, type Socket } from "socket.io-client";
import type { GameView, LobbyGame, PlayerStats } from "../game/types";

interface JoinedPlayer {
  id: number;
  baseName: string;
  displayName: string;
}

interface PlatformJoinedPayload {
  player: JoinedPlayer;
  sessionToken: string;
  stats: PlayerStats;
  games: LobbyGame[];
}

interface GameUpdatedPayload {
  game: GameView;
}

interface ErrorPayload {
  message: string;
}

const serverUrl = process.env.SMOKE_URL ?? "http://localhost:3001";
const timeoutMs = 6000;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const waitForEvent = <T>(
  socket: Socket,
  eventName: string,
  label: string,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`${label} timed out waiting for ${eventName}`));
    }, timeoutMs);

    const cleanup = (): void => {
      clearTimeout(timeout);
      socket.off(eventName, onEvent);
      socket.off("error-message", onError);
    };

    const onEvent = (payload: T): void => {
      cleanup();
      resolve(payload);
    };

    const onError = (payload: ErrorPayload): void => {
      cleanup();
      reject(new Error(`${label} server error: ${payload.message}`));
    };

    socket.once(eventName, onEvent);
    socket.once("error-message", onError);
  });

const connectClient = (label: string): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const socket = createClient(serverUrl, {
      transports: ["websocket"],
      reconnection: false,
      timeout: timeoutMs,
    });

    const timeout = setTimeout(() => {
      cleanup();
      socket.disconnect();
      reject(new Error(`${label} connection timed out`));
    }, timeoutMs);

    const cleanup = (): void => {
      clearTimeout(timeout);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
    };

    const onConnect = (): void => {
      cleanup();
      socket.on("error-message", (payload: ErrorPayload) => {
        console.error(`[${label}] error-message: ${payload.message}`);
      });
      resolve(socket);
    };

    const onConnectError = (error: Error): void => {
      cleanup();
      socket.disconnect();
      reject(new Error(`${label} connection failed: ${error.message}`));
    };

    socket.once("connect", onConnect);
    socket.once("connect_error", onConnectError);
  });

const joinPlatform = async (
  socket: Socket,
  payload: { name?: string; sessionToken?: string },
  label: string,
): Promise<PlatformJoinedPayload> => {
  const joined = waitForEvent<PlatformJoinedPayload>(
    socket,
    "platform-joined",
    label,
  );

  socket.emit("join-platform", payload);

  return joined;
};

const waitForGameUpdate = (
  socket: Socket,
  label: string,
): Promise<GameUpdatedPayload> =>
  waitForEvent<GameUpdatedPayload>(socket, "game-updated", label);

const opponentShipsAreHidden = (game: GameView, viewerId: number): boolean =>
  game.players
    .filter((participant) => participant.player.id !== viewerId)
    .every((participant) => participant.board.ships.length === 0);

const ownShipsAreVisible = (game: GameView, viewerId: number): boolean => {
  const viewer = game.players.find(
    (participant) => participant.player.id === viewerId,
  );

  return Boolean(viewer && viewer.board.ships.length > 0);
};

const run = async (): Promise<void> => {
  let clientA: Socket | null = null;
  let clientB: Socket | null = null;

  try {
    clientA = await connectClient("client A");
    clientB = await connectClient("client B");

    const joinedA = await joinPlatform(clientA, { name: "John" }, "client A");
    const joinedB = await joinPlatform(clientB, { name: "John" }, "client B");

    assert(joinedA.player.baseName === "John", "client A base name mismatch");
    assert(joinedB.player.baseName === "John", "client B base name mismatch");
    assert(
      joinedA.player.displayName === "John",
      `expected client A display name John, got ${joinedA.player.displayName}`,
    );
    assert(
      joinedB.player.displayName === "John 2",
      `expected client B display name John 2, got ${joinedB.player.displayName}`,
    );

    console.log("Display names: John and John 2");

    const createUpdate = waitForGameUpdate(clientA, "client A create-game");

    clientA.emit("create-game", {
      gridSize: 6,
      shipConfig: [{ size: 2, count: 1 }],
      mode: "pvp",
    });

    const createdGame = (await createUpdate).game;
    const gameId = createdGame.id;

    assert(createdGame.status === "waiting", "created game should be waiting");
    console.log(`Created game ${gameId}`);

    const joinUpdateA = waitForGameUpdate(clientA, "client A join-game");
    const joinUpdateB = waitForGameUpdate(clientB, "client B join-game");

    clientB.emit("join-game", { gameId });

    const [afterJoinA, afterJoinB] = await Promise.all([
      joinUpdateA,
      joinUpdateB,
    ]);

    assert(afterJoinA.game.status === "setup", "client A should see setup");
    assert(afterJoinB.game.status === "setup", "client B should see setup");

    const shipsA = [
      {
        id: "a-ship-1",
        size: 2,
        cells: [
          { x: 2, y: 2 },
          { x: 3, y: 2 },
        ],
      },
    ];
    const shipsB = [
      {
        id: "b-ship-1",
        size: 2,
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
    ];

    const placeAUpdateA = waitForGameUpdate(clientA, "client A place-ships");
    const placeAUpdateB = waitForGameUpdate(clientB, "client B sees A place");

    clientA.emit("place-ships", { gameId, ships: shipsA });

    await Promise.all([placeAUpdateA, placeAUpdateB]);

    const placeBUpdateA = waitForGameUpdate(clientA, "client A sees B place");
    const placeBUpdateB = waitForGameUpdate(clientB, "client B place-ships");

    clientB.emit("place-ships", { gameId, ships: shipsB });

    const [readyA, readyB] = await Promise.all([
      placeBUpdateA,
      placeBUpdateB,
    ]);

    assert(readyA.game.status === "in_progress", "game should be in progress");
    assert(readyB.game.status === "in_progress", "game should be in progress");
    assert(
      ownShipsAreVisible(readyA.game, joinedA.player.id),
      "client A should see own ships",
    );
    assert(
      ownShipsAreVisible(readyB.game, joinedB.player.id),
      "client B should see own ships",
    );
    assert(
      opponentShipsAreHidden(readyA.game, joinedA.player.id),
      "client A should not see B ships",
    );
    assert(
      opponentShipsAreHidden(readyB.game, joinedB.player.id),
      "client B should not see A ships",
    );

    const fireAUpdateA = waitForGameUpdate(clientA, "client A fire");
    const fireAUpdateB = waitForGameUpdate(clientB, "client B sees A fire");

    clientA.emit("fire", { gameId, x: 0, y: 0 });

    const [afterFireA, afterFireB] = await Promise.all([
      fireAUpdateA,
      fireAUpdateB,
    ]);

    assert(
      afterFireA.game.moves.some(
        (move) =>
          move.playerId === joinedA.player.id &&
          move.x === 0 &&
          move.y === 0 &&
          move.result === "hit",
      ),
      "client A shot should be recorded as hit",
    );
    assert(
      afterFireB.game.status === "in_progress",
      "client B should still see in-progress game",
    );
    assert(
      opponentShipsAreHidden(afterFireA.game, joinedA.player.id),
      "client A should still not see B ships",
    );
    assert(
      opponentShipsAreHidden(afterFireB.game, joinedB.player.id),
      "client B should still not see A ships",
    );

    clientA.disconnect();
    clientA = null;

    const restoredA = await connectClient("client A restored");
    clientA = restoredA;

    const restoredPlatform = waitForEvent<PlatformJoinedPayload>(
      restoredA,
      "platform-joined",
      "client A restored platform",
    );
    const restoredGame = waitForGameUpdate(
      restoredA,
      "client A restored game",
    );

    restoredA.emit("join-platform", { sessionToken: joinedA.sessionToken });

    const [restoredPlatformPayload, restoredGamePayload] = await Promise.all([
      restoredPlatform,
      restoredGame,
    ]);

    assert(
      restoredPlatformPayload.player.id === joinedA.player.id,
      "session token did not restore client A",
    );
    assert(
      restoredGamePayload.game.id === gameId,
      "restored game id does not match active game",
    );
    assert(
      restoredGamePayload.game.status === "in_progress",
      "restored game should still be in progress",
    );
    assert(
      opponentShipsAreHidden(restoredGamePayload.game, joinedA.player.id),
      "restored client A should not see B ships",
    );

    const forfeitUpdateA = waitForGameUpdate(
      clientA,
      "client A sees B forfeit",
    );
    const forfeitUpdateB = waitForGameUpdate(
      clientB,
      "client B leave-game forfeit",
    );

    clientB.emit("leave-game", { gameId });

    const [afterForfeitA, afterForfeitB] = await Promise.all([
      forfeitUpdateA,
      forfeitUpdateB,
    ]);

    assert(
      afterForfeitA.game.status === "finished",
      "client A should see finished game after B leaves",
    );
    assert(
      afterForfeitA.game.winnerPlayerId === joinedA.player.id,
      "client A should win when B forfeits",
    );
    assert(
      afterForfeitB.game.winnerPlayerId !== joinedB.player.id,
      "client B should not win after forfeiting",
    );

    clientB.emit("leave-game", { gameId });

    const statsAfterForfeitA = await joinPlatform(
      clientA,
      { sessionToken: joinedA.sessionToken },
      "client A stats after forfeit",
    );
    const statsAfterForfeitB = await joinPlatform(
      clientB,
      { sessionToken: joinedB.sessionToken },
      "client B stats after forfeit",
    );

    assert(
      statsAfterForfeitA.stats.gamesPlayed === 1 &&
        statsAfterForfeitA.stats.wins === 1,
      "client A stats should count one win",
    );
    assert(
      statsAfterForfeitB.stats.gamesPlayed === 1 &&
        statsAfterForfeitB.stats.losses === 1,
      "client B stats should count one loss",
    );

    console.log(
      "Socket smoke test passed, including reconnect restore and leave-game forfeit.",
    );
  } finally {
    clientA?.disconnect();
    clientB?.disconnect();
  }
};

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
