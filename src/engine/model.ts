/**
 * Internal score model. Everything downstream (rendering sync, wait mode,
 * playback) works from this, never from raw MusicXML.
 *
 * Time unit: "beats" = quarter notes from the start of the song, as a number.
 */

export type Hand = 'right' | 'left' | 'unknown';
export type HandMode = 'right' | 'left' | 'both';

export interface TimeSignature {
  beats: number;
  beatType: number;
}

export interface Note {
  /** MIDI note number, 60 = middle C. */
  midi: number;
  /** Scientific pitch name, e.g. "C#4". */
  pitch: string;
  /** Absolute onset in quarter notes from song start. */
  startBeat: number;
  /** Sounding length in quarter notes (ties already merged). */
  durationBeats: number;
  measureIndex: number;
  staff: number;
  voice: number;
  hand: Hand;
  partIndex: number;
}

export interface Measure {
  /** 0-based position in the song. */
  index: number;
  /** MusicXML measure number as printed (may be "0" for a pickup, or "1a"). */
  number: string;
  startBeat: number;
  durationBeats: number;
  timeSignature: TimeSignature;
  /** Tempo in effect at the start of this measure, if it changed here. */
  tempoBpm?: number;
}

export interface Score {
  title?: string;
  composer?: string;
  measures: Measure[];
  /** All pitched notes in the song, sorted by startBeat then midi. */
  notes: Note[];
  initialTempoBpm: number;
  /** Number of <part> elements seen. */
  partCount: number;
}

export interface MeasureRange {
  /** Inclusive, 0-based. */
  start: number;
  /** Inclusive, 0-based. */
  end: number;
}

export function pitchName(step: string, alter: number, octave: number): string {
  const acc = alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : '';
  return `${step}${acc}${octave}`;
}

const STEP_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiNumber(step: string, alter: number, octave: number): number {
  const base = STEP_SEMITONES[step];
  if (base === undefined) throw new Error(`Unknown pitch step: ${step}`);
  return (octave + 1) * 12 + base + alter;
}

export function totalBeats(score: Score): number {
  const last = score.measures[score.measures.length - 1];
  return last ? last.startBeat + last.durationBeats : 0;
}
