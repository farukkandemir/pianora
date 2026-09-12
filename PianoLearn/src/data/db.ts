/**
 * SQLite access. One connection, opened lazily, schema created on first use.
 * Schema changes go through `migrate` with a bumped user_version.
 */
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'pianolearn.db';
const SCHEMA_VERSION = 3;

let dbPromise: Promise<SQLiteDatabase> | undefined;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        composer TEXT,
        file_name TEXT NOT NULL,
        imported_at INTEGER NOT NULL,
        total_measures INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS song_progress (
        song_id TEXT PRIMARY KEY NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        last_measure INTEGER NOT NULL DEFAULT 0,
        tempo_percent INTEGER NOT NULL DEFAULT 100,
        hand_mode TEXT NOT NULL DEFAULT 'both',
        loop_start INTEGER,
        loop_end INTEGER,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  if (current < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }

  if (current < 3) {
    // Which built-in catalogue piece a song came from, if any (Browse shows "Added").
    await db.execAsync('ALTER TABLE songs ADD COLUMN catalog_id TEXT');
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
