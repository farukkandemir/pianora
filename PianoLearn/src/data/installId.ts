/**
 * Anonymous id for this installation, made once on first use and kept in the
 * settings table. Sent with every server request so that, when accounts
 * arrive, a login can claim everything this phone did before it.
 * Web analogy: the guest id a shop keeps in a cookie before you sign up.
 */
import { getDb } from './db';

const KEY = 'installId';
let cached: string | undefined;

export async function getInstallId(): Promise<string> {
  if (cached) return cached;
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', KEY);
  if (row) {
    cached = JSON.parse(row.value);
    return cached!;
  }
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', KEY, JSON.stringify(id));
  cached = id;
  return id;
}
