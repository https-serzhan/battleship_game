import path from "node:path";
import Database from "better-sqlite3";

let database: Database.Database | null = null;

export const getDatabase = (): Database.Database => {
  if (!database) {
    const dbPath = path.resolve(process.cwd(), process.env.DB_PATH ?? "battleship.db");
    database = new Database(dbPath);
    database.pragma("foreign_keys = ON");
  }

  return database;
};
