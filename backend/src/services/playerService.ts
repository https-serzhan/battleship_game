import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database";
import type { Player, PlayerStats } from "../game/types";
import { ensureStats } from "./statsService";

interface PlayerRow {
  id: number;
  base_name: string;
  display_name: string;
  session_token: string;
  created_at: string;
  last_seen_at: string;
}

const mapPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  baseName: row.base_name,
  displayName: row.display_name,
  sessionToken: row.session_token,
  createdAt: row.created_at,
  lastSeenAt: row.last_seen_at,
});

const normalizeBaseName = (baseName: string): string => {
  const trimmed = baseName.trim().replace(/\s+/g, " ");

  if (trimmed.length === 0) {
    throw new Error("Name is required");
  }

  if (trimmed.length > 40) {
    throw new Error("Name must be 40 characters or fewer");
  }

  return trimmed;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Error &&
  "code" in error &&
  (error as { code: unknown }).code === "SQLITE_CONSTRAINT_UNIQUE";

const loadPlayer = (playerId: number): Player => {
  const row = getDatabase()
    .prepare<[number], PlayerRow>("SELECT * FROM players WHERE id = ?")
    .get(playerId);

  if (!row) {
    throw new Error("Unable to load player");
  }

  return mapPlayer(row);
};

const getPlayerBySessionToken = (sessionToken: string): Player | null => {
  const row = getDatabase()
    .prepare<[string], PlayerRow>(
      "SELECT * FROM players WHERE session_token = ?",
    )
    .get(sessionToken);

  return row ? mapPlayer(row) : null;
};

export const createPlayerWithUniqueDisplayName = (baseName: string): Player => {
  const db = getDatabase();
  const normalized = normalizeBaseName(baseName);
  const transaction = db.transaction((): Player => {
    let suffix = 1;

    while (true) {
      const displayName = suffix === 1 ? normalized : `${normalized} ${suffix}`;

      try {
        const result = db
          .prepare<[string, string, string]>(
            `
              INSERT INTO players (base_name, display_name, session_token)
              VALUES (?, ?, ?)
            `,
          )
          .run(normalized, displayName, randomUUID());

        const playerId = Number(result.lastInsertRowid);

        ensureStats(playerId);

        return loadPlayer(playerId);
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }

      suffix += 1;
    }
  });

  return transaction();
};

export const createOrResumePlayer = (
  baseName: string | undefined,
  sessionToken: string | undefined,
): Player => {
  if (sessionToken) {
    const existing = getPlayerBySessionToken(sessionToken);

    if (existing) {
      updateLastSeen(existing.id);
      return loadPlayer(existing.id);
    }
  }

  if (!baseName) {
    throw new Error("Name is required");
  }

  return createPlayerWithUniqueDisplayName(baseName);
};

export const getPlayerStats = (playerId: number): PlayerStats =>
  ensureStats(playerId);

export const updateLastSeen = (playerId: number): void => {
  getDatabase()
    .prepare<[number]>(
      "UPDATE players SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .run(playerId);
};

export const getPlayerById = (playerId: number): Player | null => {
  const row = getDatabase()
    .prepare<[number], PlayerRow>("SELECT * FROM players WHERE id = ?")
    .get(playerId);

  return row ? mapPlayer(row) : null;
};
