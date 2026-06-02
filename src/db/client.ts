import * as SQLite from "expo-sqlite";
import { runMigrations } from "./migrations";

const DB_NAME = "parchment.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await runMigrations(db);
  dbInstance = db;
  return db;
}

export async function resetDatabaseInstanceForTests(): Promise<void> {
  dbInstance = null;
}
