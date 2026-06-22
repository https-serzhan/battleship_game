import { getDatabase } from "../db/database";
import type { PlayerStats } from "../game/types";

interface StatsRow {
  player_id: number;
  games_played: number;
  wins: number;
  losses: number;
  shots: number;
  hits: number;
  misses: number;
}

const mapStats = (row: StatsRow): PlayerStats => ({
  playerId: row.player_id,
  gamesPlayed: row.games_played,
  wins: row.wins,
  losses: row.losses,
  shots: row.shots,
  hits: row.hits,
  misses: row.misses,
});

export const ensureStats = (playerId: number): PlayerStats => {
  const db = getDatabase();

  db.prepare<[number]>(
    "INSERT OR IGNORE INTO stats (player_id) VALUES (?)",
  ).run(playerId);

  const row = db
    .prepare<[number], StatsRow>("SELECT * FROM stats WHERE player_id = ?")
    .get(playerId);

  if (!row) {
    throw new Error("Unable to load player stats");
  }

  return mapStats(row);
};

export const recordShot = (playerId: number, hit: boolean): void => {
  ensureStats(playerId);

  getDatabase()
    .prepare<[number, number, number]>(
      `
        UPDATE stats
        SET shots = shots + 1,
            hits = hits + ?,
            misses = misses + ?
        WHERE player_id = ?
      `,
    )
    .run(hit ? 1 : 0, hit ? 0 : 1, playerId);
};

export const recordGameResult = (winnerId: number, loserId: number): void => {
  ensureStats(winnerId);
  ensureStats(loserId);

  const db = getDatabase();

  db.prepare<[number]>(
    `
      UPDATE stats
      SET games_played = games_played + 1,
          wins = wins + 1
      WHERE player_id = ?
    `,
  ).run(winnerId);

  db.prepare<[number]>(
    `
      UPDATE stats
      SET games_played = games_played + 1,
          losses = losses + 1
      WHERE player_id = ?
    `,
  ).run(loserId);
};
