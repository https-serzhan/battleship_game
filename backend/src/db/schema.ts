import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";

interface TableInfoRow {
  name: string;
}

interface PlayerSessionRow {
  id: number;
}

const hasColumn = (tableName: string, columnName: string): boolean =>
  getDatabase()
    .prepare<[], TableInfoRow>(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column) => column.name === columnName);

const backfillMissingSessionTokens = (): void => {
  const db = getDatabase();
  const rows = db
    .prepare<[], PlayerSessionRow>(
      "SELECT id FROM players WHERE session_token IS NULL OR session_token = ''",
    )
    .all();

  for (const row of rows) {
    db.prepare<[string, number]>(
      "UPDATE players SET session_token = ? WHERE id = ?",
    ).run(randomUUID(), row.id);
  }
};

const migratePlayersTable = (): void => {
  const db = getDatabase();

  if (!hasColumn("players", "session_token")) {
    db.exec("ALTER TABLE players ADD COLUMN session_token TEXT");
  }

  backfillMissingSessionTokens();
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_session_token ON players(session_token)",
  );
};

export const initializeSchema = (): void => {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_name TEXT NOT NULL,
      display_name TEXT NOT NULL UNIQUE,
      session_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stats (
      player_id INTEGER PRIMARY KEY,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      shots INTEGER DEFAULT 0,
      hits INTEGER DEFAULT 0,
      misses INTEGER DEFAULT 0,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL CHECK(status IN ('waiting', 'setup', 'in_progress', 'finished')),
      mode TEXT NOT NULL DEFAULT 'pvp' CHECK(mode IN ('pvp', 'computer')),
      grid_size INTEGER NOT NULL,
      ship_config_json TEXT NOT NULL,
      creator_player_id INTEGER NOT NULL,
      opponent_player_id INTEGER,
      current_turn_player_id INTEGER,
      winner_player_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME,
      FOREIGN KEY(creator_player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY(opponent_player_id) REFERENCES players(id) ON DELETE SET NULL,
      FOREIGN KEY(current_turn_player_id) REFERENCES players(id) ON DELETE SET NULL,
      FOREIGN KEY(winner_player_id) REFERENCES players(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS game_players (
      game_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('A', 'B')),
      ships_json TEXT NOT NULL DEFAULT '[]',
      shots_json TEXT NOT NULL DEFAULT '[]',
      ready INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(game_id, player_id),
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      turn_number INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('hit', 'miss', 'sunk', 'win')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id);
    CREATE INDEX IF NOT EXISTS idx_moves_game_turn ON moves(game_id, turn_number);
  `);

  migratePlayersTable();
};
