import { SCHEMA_V1 } from "./schema";

export interface Migration {
  version: number;
  sql: string;
}

export const migrations: Migration[] = [
  { version: 1, sql: SCHEMA_V1 },
];

interface DbLike {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string): Promise<T[]>;
}

async function getUserVersion(db: DbLike): Promise<number> {
  const rows = await db.getAllAsync<{ user_version: number }>("PRAGMA user_version;");
  return rows[0]?.user_version ?? 0;
}

export async function runMigrations(db: DbLike): Promise<void> {
  const current = await getUserVersion(db);
  const pending = migrations.filter((m) => m.version > current);
  for (const m of pending) {
    await db.execAsync(m.sql);
    await db.execAsync(`PRAGMA user_version = ${m.version};`);
  }
}
