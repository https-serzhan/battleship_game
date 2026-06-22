import { getDatabase } from "../db/database";
import { randomShot } from "../game/computerPlayer";
import {
  areAllShipsSunk,
  getShotResult,
  isInsideBoard,
  validateShipConfig,
  validateShipsPlacement,
} from "../game/gameRules";
import { autoPlaceShips } from "../game/shipPlacement";
import type {
  GameMode,
  GameStatus,
  GameView,
  LobbyGame,
  MoveRecord,
  PlayerRole,
  PlayerSummary,
  Ship,
  ShipConfigItem,
  ShotRecord,
  ShotResult,
} from "../game/types";
import { createPlayerWithUniqueDisplayName } from "./playerService";
import { recordGameResult, recordShot } from "./statsService";

interface GameRow {
  id: number;
  status: GameStatus;
  mode: GameMode;
  grid_size: number;
  ship_config_json: string;
  creator_player_id: number;
  opponent_player_id: number | null;
  current_turn_player_id: number | null;
  winner_player_id: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface GamePlayerRow {
  game_id: number;
  player_id: number;
  role: PlayerRole;
  ships_json: string;
  shots_json: string;
  ready: number;
  base_name: string;
  display_name: string;
}

interface MoveRow {
  id: number;
  game_id: number;
  turn_number: number;
  player_id: number;
  x: number;
  y: number;
  result: ShotResult;
  created_at: string;
}

interface LobbyGameRow {
  id: number;
  status: GameStatus;
  mode: GameMode;
  grid_size: number;
  ship_config_json: string;
  created_at: string;
  creator_id: number;
  creator_base_name: string;
  creator_display_name: string;
  opponent_id: number | null;
  opponent_base_name: string | null;
  opponent_display_name: string | null;
}

const parseJson = <T>(value: string): T => JSON.parse(value) as T;

const stringifyJson = (value: unknown): string => JSON.stringify(value);

const mapMove = (row: MoveRow): MoveRecord => ({
  id: row.id,
  gameId: row.game_id,
  turnNumber: row.turn_number,
  playerId: row.player_id,
  x: row.x,
  y: row.y,
  result: row.result,
  createdAt: row.created_at,
});

const playerSummaryFromGamePlayer = (row: GamePlayerRow): PlayerSummary => ({
  id: row.player_id,
  baseName: row.base_name,
  displayName: row.display_name,
});

const mapLobbyGame = (row: LobbyGameRow): LobbyGame => ({
  id: row.id,
  status: row.status,
  mode: row.mode,
  gridSize: row.grid_size,
  shipConfig: parseJson<ShipConfigItem[]>(row.ship_config_json),
  creator: {
    id: row.creator_id,
    baseName: row.creator_base_name,
    displayName: row.creator_display_name,
  },
  opponent:
    row.opponent_id && row.opponent_base_name && row.opponent_display_name
      ? {
          id: row.opponent_id,
          baseName: row.opponent_base_name,
          displayName: row.opponent_display_name,
        }
      : null,
  createdAt: row.created_at,
});

const getGameRow = (gameId: number): GameRow => {
  const row = getDatabase()
    .prepare<[number], GameRow>("SELECT * FROM games WHERE id = ?")
    .get(gameId);

  if (!row) {
    throw new Error("Game not found");
  }

  return row;
};

const getGamePlayers = (gameId: number): GamePlayerRow[] =>
  getDatabase()
    .prepare<[number], GamePlayerRow>(
      `
        SELECT gp.*, p.base_name, p.display_name
        FROM game_players gp
        JOIN players p ON p.id = gp.player_id
        WHERE gp.game_id = ?
        ORDER BY gp.role ASC
      `,
    )
    .all(gameId);

const getMoves = (gameId: number): MoveRecord[] =>
  getDatabase()
    .prepare<[number], MoveRow>(
      "SELECT * FROM moves WHERE game_id = ? ORDER BY turn_number ASC",
    )
    .all(gameId)
    .map(mapMove);

const getMembership = (
  gameId: number,
  playerId: number,
): GamePlayerRow => {
  const row = getDatabase()
    .prepare<[number, number], GamePlayerRow>(
      `
        SELECT gp.*, p.base_name, p.display_name
        FROM game_players gp
        JOIN players p ON p.id = gp.player_id
        WHERE gp.game_id = ? AND gp.player_id = ?
      `,
    )
    .get(gameId, playerId);

  if (!row) {
    throw new Error("Player is not in this game");
  }

  return row;
};

const nextTurnNumber = (gameId: number): number => {
  const row = getDatabase()
    .prepare<[number], { next_turn: number }>(
      "SELECT COALESCE(MAX(turn_number), 0) + 1 AS next_turn FROM moves WHERE game_id = ?",
    )
    .get(gameId);

  return row?.next_turn ?? 1;
};

const ensurePlayerExists = (playerId: number): void => {
  const row = getDatabase()
    .prepare<[number], { id: number }>("SELECT id FROM players WHERE id = ?")
    .get(playerId);

  if (!row) {
    throw new Error("Player not found");
  }
};

const opponentFor = (
  players: GamePlayerRow[],
  playerId: number,
): GamePlayerRow => {
  const opponent = players.find((player) => player.player_id !== playerId);

  if (!opponent) {
    throw new Error("Opponent not found");
  }

  return opponent;
};

const roleAPlayerId = (players: GamePlayerRow[]): number => {
  const roleA = players.find((player) => player.role === "A");

  if (!roleA) {
    throw new Error("Role A player not found");
  }

  return roleA.player_id;
};

const applyShot = (
  gameId: number,
  playerId: number,
  x: number,
  y: number,
): void => {
  const db = getDatabase();
  const game = getGameRow(gameId);

  if (game.status !== "in_progress") {
    throw new Error("Game is not in progress");
  }

  if (game.current_turn_player_id !== playerId) {
    throw new Error("It is not this player's turn");
  }

  if (!isInsideBoard(game.grid_size, { x, y })) {
    throw new Error("Shot coordinates must be inside the board");
  }

  const players = getGamePlayers(gameId);
  const attacker = getMembership(gameId, playerId);
  const defender = opponentFor(players, playerId);
  const attackerShots = parseJson<ShotRecord[]>(attacker.shots_json);
  const defenderShips = parseJson<Ship[]>(defender.ships_json);
  const preliminaryResult = getShotResult(defenderShips, x, y, attackerShots);
  const turnNumber = nextTurnNumber(gameId);
  const draftShot: ShotRecord = {
    x,
    y,
    result: preliminaryResult,
    turnNumber,
    playerId,
  };
  const won = areAllShipsSunk(defenderShips, [...attackerShots, draftShot]);
  const result: ShotResult = won ? "win" : preliminaryResult;
  const shot: ShotRecord = { ...draftShot, result };

  db.prepare<[string, number, number]>(
    "UPDATE game_players SET shots_json = ? WHERE game_id = ? AND player_id = ?",
  ).run(stringifyJson([...attackerShots, shot]), gameId, playerId);

  db.prepare<[number, number, number, number, number, ShotResult]>(
    `
      INSERT INTO moves (game_id, turn_number, player_id, x, y, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(gameId, turnNumber, playerId, x, y, result);

  recordShot(playerId, result !== "miss");

  if (won) {
    db.prepare<[number, number]>(
      `
        UPDATE games
        SET status = 'finished',
            winner_player_id = ?,
            current_turn_player_id = NULL,
            finished_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    ).run(playerId, gameId);

    recordGameResult(playerId, defender.player_id);
    return;
  }

  db.prepare<[number, number]>(
    "UPDATE games SET current_turn_player_id = ? WHERE id = ?",
  ).run(defender.player_id, gameId);
};

const applyComputerTurnIfNeeded = (gameId: number): void => {
  const game = getGameRow(gameId);

  if (game.mode !== "computer" || game.status !== "in_progress") {
    return;
  }

  const players = getGamePlayers(gameId);
  const computer = players.find((player) => player.role === "B");

  if (!computer || game.current_turn_player_id !== computer.player_id) {
    return;
  }

  const previousShots = parseJson<ShotRecord[]>(computer.shots_json);
  const shot = randomShot(game.grid_size, previousShots);

  applyShot(gameId, computer.player_id, shot.x, shot.y);
};

const startIfReady = (gameId: number): void => {
  const db = getDatabase();
  const game = getGameRow(gameId);

  if (game.status !== "setup") {
    return;
  }

  const players = getGamePlayers(gameId);

  if (players.length !== 2 || players.some((player) => player.ready !== 1)) {
    return;
  }

  db.prepare<[number, number]>(
    `
      UPDATE games
      SET status = 'in_progress',
          started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
          current_turn_player_id = ?
      WHERE id = ?
    `,
  ).run(roleAPlayerId(players), gameId);
};

export const createGame = (
  creatorPlayerId: number,
  gridSize: number,
  shipConfig: ShipConfigItem[],
  mode: GameMode = "pvp",
): GameView => {
  validateShipConfig(gridSize, shipConfig);
  ensurePlayerExists(creatorPlayerId);

  const db = getDatabase();

  const transaction = db.transaction((): number => {
    let opponentPlayerId: number | null = null;
    let status: GameStatus = "waiting";

    if (mode === "computer") {
      const computer = createPlayerWithUniqueDisplayName("Computer");
      opponentPlayerId = computer.id;
      status = "setup";
    }

    const result = db
      .prepare<
        [
          GameStatus,
          GameMode,
          number,
          string,
          number,
          number | null,
        ]
      >(
        `
          INSERT INTO games (
            status,
            mode,
            grid_size,
            ship_config_json,
            creator_player_id,
            opponent_player_id
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        status,
        mode,
        gridSize,
        stringifyJson(shipConfig),
        creatorPlayerId,
        opponentPlayerId,
      );

    const gameId = Number(result.lastInsertRowid);

    db.prepare<[number, number, PlayerRole]>(
      "INSERT INTO game_players (game_id, player_id, role) VALUES (?, ?, ?)",
    ).run(gameId, creatorPlayerId, "A");

    if (mode === "computer" && opponentPlayerId) {
      db.prepare<[number, number, PlayerRole, string, number]>(
        `
          INSERT INTO game_players (
            game_id,
            player_id,
            role,
            ships_json,
            ready
          )
          VALUES (?, ?, ?, ?, ?)
        `,
      ).run(
        gameId,
        opponentPlayerId,
        "B",
        stringifyJson(autoPlaceShips(gridSize, shipConfig)),
        1,
      );
    }

    return gameId;
  });

  return getGameForPlayer(transaction(), creatorPlayerId);
};

export const listLobbyGames = (): LobbyGame[] =>
  getDatabase()
    .prepare<[], LobbyGameRow>(
      `
        SELECT
          g.id,
          g.status,
          g.mode,
          g.grid_size,
          g.ship_config_json,
          g.created_at,
          creator.id AS creator_id,
          creator.base_name AS creator_base_name,
          creator.display_name AS creator_display_name,
          opponent.id AS opponent_id,
          opponent.base_name AS opponent_base_name,
          opponent.display_name AS opponent_display_name
        FROM games g
        JOIN players creator ON creator.id = g.creator_player_id
        LEFT JOIN players opponent ON opponent.id = g.opponent_player_id
        WHERE g.status = 'waiting'
        ORDER BY g.created_at DESC
      `,
    )
    .all()
    .map(mapLobbyGame);

export const joinGame = (gameId: number, playerId: number): GameView => {
  ensurePlayerExists(playerId);

  const db = getDatabase();
  const transaction = db.transaction((): void => {
    const game = getGameRow(gameId);

    if (game.status !== "waiting") {
      throw new Error("Game is not waiting for an opponent");
    }

    if (game.mode !== "pvp") {
      throw new Error("Only PvP games can be joined");
    }

    if (game.creator_player_id === playerId) {
      throw new Error("Creator cannot join their own game");
    }

    if (game.opponent_player_id !== null) {
      throw new Error("Game already has an opponent");
    }

    const existing = db
      .prepare<[number, number], { player_id: number }>(
        "SELECT player_id FROM game_players WHERE game_id = ? AND player_id = ?",
      )
      .get(gameId, playerId);

    if (existing) {
      throw new Error("Player is already in this game");
    }

    db.prepare<[number, number]>(
      `
        UPDATE games
        SET status = 'setup',
            opponent_player_id = ?
        WHERE id = ?
      `,
    ).run(playerId, gameId);

    db.prepare<[number, number, PlayerRole]>(
      "INSERT INTO game_players (game_id, player_id, role) VALUES (?, ?, ?)",
    ).run(gameId, playerId, "B");
  });

  transaction();

  return getGameForPlayer(gameId, playerId);
};

export const getGameParticipantIds = (gameId: number): number[] =>
  getGamePlayers(gameId).map((player) => player.player_id);

export const getLiveGameIdsForPlayer = (playerId: number): number[] =>
  getDatabase()
    .prepare<[number], { game_id: number }>(
      `
        SELECT gp.game_id
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE gp.player_id = ?
          AND g.status IN ('waiting', 'setup', 'in_progress')
      `,
    )
    .all(playerId)
    .map((row) => row.game_id);

export const getGameForPlayer = (
  gameId: number,
  playerId: number,
): GameView => {
  const game = getGameRow(gameId);
  const players = getGamePlayers(gameId);

  if (!players.some((player) => player.player_id === playerId)) {
    throw new Error("Player is not in this game");
  }

  const moves = getMoves(gameId);
  const participantViews = players.map((player) => {
    const ships = parseJson<Ship[]>(player.ships_json);
    const shotsFired = parseJson<ShotRecord[]>(player.shots_json);
    const incoming = players.find(
      (candidate) => candidate.player_id !== player.player_id,
    );
    const shotsReceived = incoming
      ? parseJson<ShotRecord[]>(incoming.shots_json)
      : [];
    const isViewer = player.player_id === playerId;

    return {
      player: playerSummaryFromGamePlayer(player),
      role: player.role,
      ready: player.ready === 1,
      isViewer,
      board: {
        ships: isViewer || game.status === "finished" ? ships : [],
        shotsFired,
        shotsReceived,
      },
    };
  });

  return {
    id: game.id,
    status: game.status,
    mode: game.mode,
    gridSize: game.grid_size,
    shipConfig: parseJson<ShipConfigItem[]>(game.ship_config_json),
    creatorPlayerId: game.creator_player_id,
    opponentPlayerId: game.opponent_player_id,
    currentTurnPlayerId: game.current_turn_player_id,
    winnerPlayerId: game.winner_player_id,
    createdAt: game.created_at,
    startedAt: game.started_at,
    finishedAt: game.finished_at,
    players: participantViews,
    moves,
  };
};

export const placeShips = (
  gameId: number,
  playerId: number,
  ships: Ship[],
): GameView => {
  const db = getDatabase();

  const transaction = db.transaction((): void => {
    const game = getGameRow(gameId);

    if (game.status !== "setup") {
      throw new Error("Ships can only be placed during setup");
    }

    getMembership(gameId, playerId);

    const shipConfig = parseJson<ShipConfigItem[]>(game.ship_config_json);
    validateShipsPlacement(game.grid_size, shipConfig, ships);

    db.prepare<[string, number, number]>(
      `
        UPDATE game_players
        SET ships_json = ?,
            ready = 1
        WHERE game_id = ? AND player_id = ?
      `,
    ).run(stringifyJson(ships), gameId, playerId);

    startIfReady(gameId);
  });

  transaction();

  return getGameForPlayer(gameId, playerId);
};

export const fireShot = (
  gameId: number,
  playerId: number,
  x: number,
  y: number,
): GameView => {
  const db = getDatabase();

  const transaction = db.transaction((): void => {
    applyShot(gameId, playerId, x, y);
    applyComputerTurnIfNeeded(gameId);
  });

  transaction();

  return getGameForPlayer(gameId, playerId);
};
