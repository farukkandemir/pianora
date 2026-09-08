/**
 * Song library: import, list, open, delete, and per-song practice progress.
 */
import type { File } from 'expo-file-system';

import { loadScore, type LoadedScore } from '@/engine/musicxml/load';
import type { HandMode } from '@/engine/model';

import { getDb } from './db';
import { deleteSongFile, readSongBytes, storeSongFile } from './files';

export interface SongRecord {
  id: string;
  title: string;
  composer: string | null;
  fileName: string;
  importedAt: number;
  totalMeasures: number;
}

export interface SongProgress {
  songId: string;
  lastMeasure: number;
  tempoPercent: number;
  handMode: HandMode;
  loopStart: number | null;
  loopEnd: number | null;
  updatedAt: number;
}

export interface SongListItem extends SongRecord {
  progress: SongProgress | null;
}

interface SongRow {
  id: string;
  title: string;
  composer: string | null;
  file_name: string;
  imported_at: number;
  total_measures: number;
}

interface ProgressRow {
  song_id: string;
  last_measure: number;
  tempo_percent: number;
  hand_mode: HandMode;
  loop_start: number | null;
  loop_end: number | null;
  updated_at: number;
}

export class ImportError extends Error {}

export async function importSong(picked: File): Promise<SongRecord> {
  const bytes = await picked.bytes();
  let loaded: LoadedScore;
  try {
    loaded = loadScore(bytes);
  } catch (e) {
    throw new ImportError(`This file isn't valid MusicXML. ${e instanceof Error ? e.message : ''}`.trim());
  }

  const id = newId();
  const fileName = storeSongFile(picked, id);
  const record: SongRecord = {
    id,
    title: loaded.score.title ?? guessTitle(picked.name),
    composer: loaded.score.composer ?? null,
    fileName,
    importedAt: Date.now(),
    totalMeasures: loaded.score.measures.length,
  };

  const db = await getDb();
  await db.runAsync(
    'INSERT INTO songs (id, title, composer, file_name, imported_at, total_measures) VALUES (?, ?, ?, ?, ?, ?)',
    record.id, record.title, record.composer, record.fileName, record.importedAt, record.totalMeasures,
  );
  return record;
}

export async function listSongs(): Promise<SongListItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SongRow & Partial<ProgressRow>>(`
    SELECT s.*, p.song_id, p.last_measure, p.tempo_percent, p.hand_mode, p.loop_start, p.loop_end, p.updated_at
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

export async function deleteSong(song: SongRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM songs WHERE id = ?', song.id);
  deleteSongFile(song.fileName);
}

export async function getProgress(songId: string): Promise<SongProgress | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProgressRow>('SELECT * FROM song_progress WHERE song_id = ?', songId);
  return row ? toProgress(row) : null;
}

export async function saveProgress(p: Omit<SongProgress, 'updatedAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO song_progress (song_id, last_measure, tempo_percent, hand_mode, loop_start, loop_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(song_id) DO UPDATE SET
       last_measure = excluded.last_measure, tempo_percent = excluded.tempo_percent,
       hand_mode = excluded.hand_mode, loop_start = excluded.loop_start,
       loop_end = excluded.loop_end, updated_at = excluded.updated_at`,
    p.songId, p.lastMeasure, p.tempoPercent, p.handMode, p.loopStart, p.loopEnd, Date.now(),
  );
}

function toSong(r: SongRow): SongRecord {
  return { id: r.id, title: r.title, composer: r.composer, fileName: r.file_name, importedAt: r.imported_at, totalMeasures: r.total_measures };
}

function toProgress(r: ProgressRow): SongProgress {
  return { songId: r.song_id, lastMeasure: r.last_measure, tempoPercent: r.tempo_percent, handMode: r.hand_mode, loopStart: r.loop_start, loopEnd: r.loop_end, updatedAt: r.updated_at };
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function guessTitle(fileName: string): string {
  return fileName.replace(/\.(musicxml|xml|mxl)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
}
