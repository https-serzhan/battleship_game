import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { io as createClient, type Socket } from "socket.io-client";
import type {
  Cell,
  GameView,
  LobbyGame,
  PlayerRole,
  PlayerStats,
  ReplayData,
  Ship,
} from "../game/types";

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

interface ReplayDataPayload {
  replay: ReplayData;
}

interface ErrorPayload {
  message: string;
}

interface ShipRow {
  player_id: number;
  role: PlayerRole;
  ships_json: string;
}

interface SmokeServer {
  url: string;
  dbPath: string | null;
  stop: () => Promise<void>;
}

const timeoutMs = 8000;
let serverUrl = process.env.SMOKE_URL ?? "";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate smoke test port"));
        return;
      }

      const { port } = address;

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });

const waitForHealth = async (
  url: string,
  child: ChildProcess,
  logs: string[],
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Smoke backend exited early with code ${child.exitCode}:\n${logs.join("")}`,
      );
    }

    try {
      const response = await fetch(`${url}/health`);

      if (response.ok) {
        return;
      }
    } catch {
      await sleep(150);
    }
  }

  throw new Error(`Smoke backend did not become healthy:\n${logs.join("")}`);
};

const removeSmokeDatabase = (dbPath: string): void => {
  for (const filePath of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    fs.rmSync(filePath, { force: true });
  }
};

const startSmokeServer = async (): Promise<SmokeServer> => {
  if (process.env.SMOKE_URL) {
    return {
      url: process.env.SMOKE_URL,
      dbPath: process.env.DB_PATH ?? null,
      stop: async () => undefined,
    };
  }

  const port = await getFreePort();
  const dbPath = path.join(
    os.tmpdir(),
    `battleship-smoke-${process.pid}-${Date.now()}.db`,
  );
  const url = `http://localhost:${port}`;
  const logs: string[] = [];
  const child = spawn(
    process.execPath,
    ["-r", "ts-node/register", "src/index.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DB_PATH: dbPath,
        FRONTEND_URL: "http://localhost:5173",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk: Buffer) => {
    logs.push(chunk.toString());
  });
  child.stderr.on("data", (chunk: Buffer) => {
    logs.push(chunk.toString());
  });

  await waitForHealth(url, child, logs);

  return {
    url,
    dbPath,
    stop: async () => {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await new Promise<void>((resolve) => {
          child.once("exit", () => resolve());
          setTimeout(resolve, 1500);
        });
      }

      removeSmokeDatabase(dbPath);
    },
  };
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

const waitForError = (
  socket: Socket,
  label: string,
): Promise<ErrorPayload> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`${label} timed out waiting for error-message`));
    }, timeoutMs);

    const cleanup = (): void => {
      clearTimeout(timeout);
      socket.off("error-message", onError);
    };

    const onError = (payload: ErrorPayload): void => {
      cleanup();
      resolve(payload);
    };

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

const requestReplay = (
  socket: Socket,
  gameId: number,
  label: string,
): Promise<ReplayDataPayload> => {
  const replay = waitForEvent<ReplayDataPayload>(socket, "replay-data", label);

  socket.emit("get-replay", { gameId });

  return replay;
};

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

const rolePlayerId = (game: GameView, role: PlayerRole): number => {
  const participant = game.players.find((player) => player.role === role);

  if (!participant) {
    throw new Error(`Role ${role} player not found`);
  }

  return participant.player.id;
};

const readShipsFromDb = (
  dbPath: string,
  gameId: number,
  role: PlayerRole,
): Ship[] => {
  const db = new Database(dbPath, { readonly: true });

  try {
    const row = db
      .prepare<[number, PlayerRole], ShipRow>(
        "SELECT * FROM game_players WHERE game_id = ? AND role = ?",
      )
      .get(gameId, role);

    if (!row) {
      throw new Error(`Unable to read role ${role} ships`);
    }

    return JSON.parse(row.ships_json) as Ship[];
  } finally {
    db.close();
  }
};

const cellKey = (cell: Cell): string => `${cell.x}:${cell.y}`;

const findMissCell = (gridSize: number, ships: Ship[]): Cell => {
  const occupied = new Set(ships.flatMap((ship) => ship.cells.map(cellKey)));

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const cell = { x, y };

      if (!occupied.has(cellKey(cell))) {
        return cell;
      }
    }
  }

  throw new Error("Unable to find a miss cell");
};

const run = async (): Promise<void> => {
  const smokeServer = await startSmokeServer();
  serverUrl = smokeServer.url;

  let clientA: Socket | null = null;
  let clientB: Socket | null = null;
  let computerClient: Socket | null = null;
  let intruderClient: Socket | null = null;

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

    const createUpdate = waitForGameUpdate(clientA, "client A create-game");

    clientA.emit("create-game", {
      gridSize: 6,
      shipConfig: [{ size: 2, count: 1 }],
      mode: "pvp",
    });

    const createdGame = (await createUpdate).game;
    const gameId = createdGame.id;

    assert(createdGame.status === "waiting", "created game should be waiting");

    const joinUpdateA = waitForGameUpdate(clientA, "client A join-game");
    const joinUpdateB = waitForGameUpdate(clientB, "client B join-game");

    clientB.emit("join-game", { gameId });

    const [afterJoinA, afterJoinB] = await Promise.all([
      joinUpdateA,
      joinUpdateB,
    ]);

    assert(afterJoinA.game.status === "setup", "client A should see setup");
    assert(afterJoinB.game.status === "setup", "client B should see setup");

    const shipsA: Ship[] = [
      {
        id: "a-ship-1",
        size: 2,
        cells: [
          { x: 2, y: 2 },
          { x: 3, y: 2 },
        ],
      },
    ];
    const shipsB: Ship[] = [
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
      readyA.game.currentTurnPlayerId === joinedA.player.id,
      "role A should start the game",
    );
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

    const fireHitA = waitForGameUpdate(clientA, "client A fire hit");
    const fireHitB = waitForGameUpdate(clientB, "client B sees A hit");

    clientA.emit("fire", { gameId, x: 0, y: 0 });

    const [afterHitA, afterHitB] = await Promise.all([fireHitA, fireHitB]);

    assert(
      afterHitA.game.moves.some(
        (move) =>
          move.playerId === joinedA.player.id &&
          move.x === 0 &&
          move.y === 0 &&
          move.result === "hit",
      ),
      "client A shot should be recorded as hit",
    );
    assert(
      afterHitA.game.currentTurnPlayerId === joinedA.player.id,
      "hit should keep the shooter's turn",
    );
    assert(
      afterHitB.game.status === "in_progress",
      "client B should still see in-progress game",
    );
    assert(
      opponentShipsAreHidden(afterHitA.game, joinedA.player.id),
      "client A should still not see B ships",
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
      restoredGamePayload.game.currentTurnPlayerId === joinedA.player.id,
      "restored turn should still belong to client A after hit",
    );
    assert(
      opponentShipsAreHidden(restoredGamePayload.game, joinedA.player.id),
      "restored client A should not see B ships",
    );

    const fireMissA = waitForGameUpdate(clientA, "client A fire miss");
    const fireMissB = waitForGameUpdate(clientB, "client B sees A miss");

    clientA.emit("fire", { gameId, x: 5, y: 5 });

    const [afterMissA] = await Promise.all([fireMissA, fireMissB]);

    assert(
      afterMissA.game.moves.some(
        (move) =>
          move.playerId === joinedA.player.id &&
          move.x === 5 &&
          move.y === 5 &&
          move.result === "miss",
      ),
      "client A miss should be recorded",
    );
    assert(
      afterMissA.game.currentTurnPlayerId === joinedB.player.id,
      "miss should switch the turn to the opponent",
    );

    const unfinishedReplayError = waitForError(
      clientA,
      "unfinished replay rejection",
    );

    clientA.emit("get-replay", { gameId });

    assert(
      (await unfinishedReplayError).message.includes("finished"),
      "unfinished replay should be rejected",
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

    const replay = (await requestReplay(clientA, gameId, "finished replay"))
      .replay;

    assert(replay.game.status === "finished", "replay game must be finished");
    assert(replay.players.length === 2, "replay should contain both players");
    assert(
      replay.players.every((replayPlayer) => replayPlayer.ships.length > 0),
      "replay should include ships after finish",
    );
    assert(replay.moves.length >= 2, "replay should contain real moves");
    assert(
      replay.moves.some((move) => move.result === "hit") &&
        replay.moves.some((move) => move.result === "miss"),
      "replay should include the recorded hit and miss",
    );

    intruderClient = await connectClient("intruder");
    await joinPlatform(intruderClient, { name: "Eve" }, "intruder");

    const unauthorizedReplayError = waitForError(
      intruderClient,
      "unauthorized replay rejection",
    );

    intruderClient.emit("get-replay", { gameId });

    assert(
      (await unauthorizedReplayError).message.includes("not in this game"),
      "unauthorized replay should be rejected",
    );

    computerClient = await connectClient("computer client");
    const joinedComputerHuman = await joinPlatform(
      computerClient,
      { name: "Computer Tester" },
      "computer client",
    );
    const computerCreateUpdate = waitForGameUpdate(
      computerClient,
      "computer create-game",
    );

    computerClient.emit("create-game", {
      gridSize: 15,
      shipConfig: [{ size: 2, count: 1 }],
      mode: "computer",
    });

    const computerSetupGame = (await computerCreateUpdate).game;
    const computerGameId = computerSetupGame.id;
    const computerPlayerId = rolePlayerId(computerSetupGame, "B");

    assert(
      computerSetupGame.mode === "computer",
      "created game should be computer mode",
    );
    assert(
      computerSetupGame.status === "setup",
      "computer game should start in setup",
    );
    assert(
      computerSetupGame.players.length === 2,
      "computer opponent should exist",
    );
    assert(
      computerSetupGame.players.some(
        (participant) =>
          participant.role === "B" &&
          participant.ready &&
          participant.player.displayName === "Computer",
      ),
      "computer opponent should be ready with stable display name",
    );
    assert(
      opponentShipsAreHidden(computerSetupGame, joinedComputerHuman.player.id),
      "computer ships should be hidden before finish",
    );
    const smokeDbPath = smokeServer.dbPath;

    assert(
      smokeDbPath,
      "local smoke database path is required for deterministic computer hit",
    );

    const computerShips = readShipsFromDb(
      smokeDbPath,
      computerGameId,
      "B",
    );
    const computerHitCell = computerShips[0].cells[0];
    const computerMissCell = findMissCell(15, computerShips);
    const humanShips: Ship[] = [
      {
        id: "human-ship-1",
        size: 2,
        cells: [
          { x: 13, y: 14 },
          { x: 14, y: 14 },
        ],
      },
    ];

    const computerStartUpdate = waitForGameUpdate(
      computerClient,
      "computer human place-ships",
    );

    computerClient.emit("place-ships", {
      gameId: computerGameId,
      ships: humanShips,
    });

    const computerStartedGame = (await computerStartUpdate).game;

    assert(
      computerStartedGame.status === "in_progress",
      "computer game should start after human ready",
    );
    assert(
      computerStartedGame.currentTurnPlayerId === joinedComputerHuman.player.id,
      "human should start first against computer",
    );

    const humanHitUpdate = waitForGameUpdate(
      computerClient,
      "human hit computer",
    );

    computerClient.emit("fire", {
      gameId: computerGameId,
      x: computerHitCell.x,
      y: computerHitCell.y,
    });

    const afterHumanHit = (await humanHitUpdate).game;

    assert(
      afterHumanHit.moves.length === 1 &&
        afterHumanHit.moves[0].playerId === joinedComputerHuman.player.id &&
        afterHumanHit.moves[0].result === "hit",
      "human hit should be recorded without computer response",
    );
    assert(
      afterHumanHit.currentTurnPlayerId === joinedComputerHuman.player.id,
      "human hit should keep the human turn",
    );
    assert(
      opponentShipsAreHidden(afterHumanHit, joinedComputerHuman.player.id),
      "computer ships should remain hidden after a non-winning hit",
    );

    const humanMissUpdate = waitForGameUpdate(
      computerClient,
      "human miss triggers computer",
    );

    computerClient.emit("fire", {
      gameId: computerGameId,
      x: computerMissCell.x,
      y: computerMissCell.y,
    });

    const afterComputerTurn = (await humanMissUpdate).game;
    const humanMiss = afterComputerTurn.moves.find(
      (move) =>
        move.playerId === joinedComputerHuman.player.id &&
        move.x === computerMissCell.x &&
        move.y === computerMissCell.y &&
        move.result === "miss",
    );

    assert(humanMiss, "human miss should be recorded");

    const computerMoves = afterComputerTurn.moves.filter(
      (move) =>
        move.playerId === computerPlayerId &&
        move.turnNumber > humanMiss.turnNumber,
    );
    const uniqueComputerTargets = new Set(
      computerMoves.map((move) => `${move.x}:${move.y}`),
    );

    assert(computerMoves.length > 0, "computer should fire after human miss");
    assert(
      uniqueComputerTargets.size === computerMoves.length,
      "computer should not repeat shot targets",
    );

    const lastComputerMove = computerMoves[computerMoves.length - 1];

    if (afterComputerTurn.status === "in_progress") {
      assert(
        lastComputerMove.result === "miss",
        "computer should stop its automated sequence after a miss",
      );
      assert(
        afterComputerTurn.currentTurnPlayerId === joinedComputerHuman.player.id,
        "computer miss should return the turn to the human",
      );
    } else {
      assert(
        afterComputerTurn.winnerPlayerId === computerPlayerId,
        "finished computer turn should mean the computer won",
      );
    }

    console.log(
      "Socket smoke test passed, including PvP, classic turns, reconnect restore, forfeit, computer mode, and replay.",
    );
  } finally {
    clientA?.disconnect();
    clientB?.disconnect();
    computerClient?.disconnect();
    intruderClient?.disconnect();
    await smokeServer.stop();
  }
};

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
