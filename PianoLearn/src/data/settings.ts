/**
 * App-wide settings, persisted one row per key in the `settings` table.
 * Web analogy: localStorage behind a typed accessor. Values are JSON.
 */
import type { HandColorKey } from '@/theme';

import { getDb } from './db';

export interface Settings {
  showKeyboard: boolean;
  /** Reconnect remembered Bluetooth keyboards on launch and foreground. */
  autoReconnect: boolean;
  rightHand: HandColorKey;
  leftHand: HandColorKey;
}

export const DEFAULT_SETTINGS: Settings = {
  showKeyboard: true,
  autoReconnect: true,
  rightHand: 'cobalt',
  leftHand: 'amber',
};

export async function loadSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored: Partial<Settings> = {};
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) stored[row.key as keyof Settings] = JSON.parse(row.value);
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}
