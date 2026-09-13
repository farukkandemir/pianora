/**
 * Song library: import, list, open, delete, and per-song practice progress.
 */
import type { File } from 'expo-file-system';

import { checkScoreInvariants } from '@/engine/invariants';
import { loadScore, type LoadedScore } from '@/engine/musicxml/load';
import { MusicXmlError } from '@/engine/musicxml/parse';
import type { HandMode } from '@/engine/model';

import { getDb } from './db';
import { deleteCoverFile, deleteSongFile, readSongBytes, storeSongFile } from './files';

export interface SongRecord {
  id: string;
  title: string;
  composer: string | null;
  fileName: string;
  importedAt: number;
  totalMeasures: number;
  /** Set when the song was added from the built-in catalogue. */
  catalogId: string | null;
  /** Downloaded cover image in the covers folder; null until one arrives. */
  coverFile: string | null;
}

export interface SongProgress {
  songId: string;
  lastMeasure: number;
  handMode: HandMode;
  loopStart: number | null;
  loopEnd: number | null;
  updatedAt: number;
}

export interface SongListItem extends SongRecord {
  progress: SongProgress | null;
}

/**
 * A piece counts as started once the player has moved past bar 1. Merely
 * opening a piece writes a progress row at bar 1, and that must not make it
 * "in progress" or the Continue hero.
 */
export function isStarted(song: SongListItem): boolean {
  return !!song.progress && song.progress.lastMeasure > 0;
}

interface SongRow {
  id: string;
  title: string;
  composer: string | null;
  file_name: string;
  imported_at: number;
  total_measures: number;
  catalog_id: string | null;
  cover_file: string | null;
}

interface ProgressRow {
  song_id: string;
  last_measure: number;
  hand_mode: HandMode;
  loop_start: number | null;
  loop_end: number | null;
  updated_at: number;
}

export type ImportErrorKind = 'not-musicxml' | 'corrupt' | 'no-notes' | 'invalid' | 'storage';

const IMPORT_MESSAGES: Record<ImportErrorKind, string> = {
  'not-musicxml': "This isn't a MusicXML file. Export the score as MusicXML (.musicxml, .xml or .mxl) and try again.",
  corrupt: "This file couldn't be read. It may be damaged or an incomplete download.",
  'no-notes': 'This file has no playable notes. Check that it contains a piano part.',
  invalid: 'This file has musical content the app could not make sense of.',
  storage: 'The song could not be saved on this device.',
};

export class ImportError extends Error {
  constructor(public readonly kind: ImportErrorKind, detail?: string) {
    super(IMPORT_MESSAGES[kind] + (detail ? ` (${detail})` : ''));
  }
}

/** Parse and validate; throws ImportError with a user-facing message. */
export function validateForImport(bytes: Uint8Array): LoadedScore {
  let loaded: LoadedScore;
  try {
    loaded = loadScore(bytes);
  } catch (e) {
    if (e instanceof MusicXmlError) throw new ImportError('not-musicxml');
    throw new ImportError('corrupt');
  }
  if (loaded.score.notes.length === 0) throw new ImportError('no-notes');
  const problems = checkScoreInvariants(loaded.score);
  if (problems.length) throw new ImportError('invalid', problems[0]);
  return loaded;
}

/** Catalogue pieces carry their own title/composer; the files often have none. */
export interface ImportMeta {
  catalogId: string;
  title: string;
  composer: string;
}

export async function importSong(picked: File, meta?: ImportMeta): Promise<SongRecord> {
  let bytes: Uint8Array;
  try {
    bytes = await picked.bytes();
  } catch {
    throw new ImportError('corrupt');
  }
  const loaded = validateForImport(bytes);

  const id = newId();
  let fileName: string;
  try {
    fileName = storeSongFile(picked, id);
  } catch (e) {
    throw new ImportError('storage', e instanceof Error ? e.message : undefined);
  }
  const record: SongRecord = {
    id,
    title: meta?.title ?? loaded.score.title ?? guessTitle(picked.name),
    composer: meta?.composer ?? loaded.score.composer ?? null,
    fileName,
    importedAt: Date.now(),
    totalMeasures: loaded.score.measures.length,
    catalogId: meta?.catalogId ?? null,
    coverFile: null,
  };

  try {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO songs (id, title, composer, file_name, imported_at, total_measures, catalog_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      record.id, record.title, record.composer, record.fileName, record.importedAt, record.totalMeasures, record.catalogId,
    );
  } catch (e) {
    deleteSongFile(fileName);
    throw new ImportError('storage', e instanceof Error ? e.message : undefined);
  }
  return record;
}

export async function listSongs(): Promise<SongListItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SongRow & Partial<ProgressRow>>(`
    SELECT s.*, p.song_id, p.last_measure, p.hand_mode, p.loop_start, p.loop_end, p.updated_at
    FROM songs s LEFT JOIN song_progress p ON p.song_id = s.id
    ORDER BY COALESCE(p.updated_at, s.imported_at) DESC
  `);
  return rows.map((r) => ({ ...toSong(r), progress: r.song_id ? toProgress(r as ProgressRow) : null }));
}

export async function getSong(id: string): Promise<SongRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SongRow>('SELECT * FROM songs WHERE id = ?', id);
  return row ? toSong(row) : null;
}

export async function openSong(song: SongRecord): Promise<LoadedScore> {
  return loadScore(await readSongBytes(song.fileName));
}

/** Renames a piece. The title is trimmed; an empty title is refused. */
export async function renameSong(songId: string, title: string): Promise<void> {
  const clean = title.trim();
  if (!clean) throw new Error('The title cannot be empty.');
  const db = await getDb();
  await db.runAsync('UPDATE songs SET title = ? WHERE id = ?', clean, songId);
}

export async function deleteSong(song: SongRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM songs WHERE id = ?', song.id);
  deleteSongFile(song.fileName);
  if (song.coverFile) deleteCoverFile(song.coverFile);
}

/** Records the downloaded cover for a piece. Returns false if the piece is gone. */
export async function setSongCover(songId: string, coverFile: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync('UPDATE songs SET cover_file = ? WHERE id = ?', coverFile, songId);
  return result.changes > 0;
}

export async function getProgress(songId: string): Promise<SongProgress | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProgressRow>('SELECT * FROM song_progress WHERE song_id = ?', songId);
  return row ? toProgress(row) : null;
}

export async function saveProgress(p: Omit<SongProgress, 'updatedAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO song_progress (song_id, last_measure, hand_mode, loop_start, loop_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(song_id) DO UPDATE SET
       last_measure = excluded.last_measure, hand_mode = excluded.hand_mode,
       loop_start = excluded.loop_start, loop_end = excluded.loop_end,
       updated_at = excluded.updated_at`,
    p.songId, p.lastMeasure, p.handMode, p.loopStart, p.loopEnd, Date.now(),
  );
}

function toSong(r: SongRow): SongRecord {
  return {
    id: r.id, title: r.title, composer: r.composer, fileName: r.file_name,
    importedAt: r.imported_at, totalMeasures: r.total_measures, catalogId: r.catalog_id ?? null,
    coverFile: r.cover_file ?? null,
  };
}

function toProgress(r: ProgressRow): SongProgress {
  return { songId: r.song_id, lastMeasure: r.last_measure, handMode: r.hand_mode, loopStart: r.loop_start, loopEnd: r.loop_end, updatedAt: r.updated_at };
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function guessTitle(fileName: string): string {
  return fileName.replace(/\.(musicxml|xml|mxl)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
}
