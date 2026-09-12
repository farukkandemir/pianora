/**
 * Turns a Score into wall-clock time for "Listen": every note gets a start
 * and end in milliseconds, in performed order (repeats unrolled), at the
 * tempo written in the score.
 *
 * Tempo marks are positional: the tempo in effect at a measure is the last
 * mark at or before it in score order, whatever pass of a repeat is playing.
 * A tempo is constant within a measure (marks are per measure in the model).
 *
 * Pure TypeScript, no React or native imports.
 */
import type { Score } from './model';

export interface TimelineMeasure {
  /** Position in the performed order. */
  orderPos: number;
  measureIndex: number;
  startMs: number;
  endMs: number;
  msPerBeat: number;
}

export interface TimelineNote {
  midi: number;
  startMs: number;
  endMs: number;
  measureIndex: number;
  orderPos: number;
}

export interface Timeline {
  /** Sorted by startMs, then midi. */
  notes: TimelineNote[];
  /** In performed order; contiguous, measures[i].endMs === measures[i+1].startMs. */
  measures: TimelineMeasure[];
  totalMs: number;
}

/** Tempo in effect at each measure, by measure index, in score order. */
export function effectiveTempos(score: Score): number[] {
  let bpm = score.initialTempoBpm;
  return score.measures.map((m) => {
    if (m.tempoBpm !== undefined && m.tempoBpm > 0) bpm = m.tempoBpm;
    return bpm;
  });
}

export function buildTimeline(score: Score, tempoPercent = 100): Timeline {
  const factor = 100 / Math.max(1, tempoPercent);
  const tempos = effectiveTempos(score);
  const order = score.playbackOrder.length ? score.playbackOrder : score.measures.map((m) => m.index);

  const measures: TimelineMeasure[] = [];
  let clock = 0;
  order.forEach((measureIndex, orderPos) => {
    const m = score.measures[measureIndex];
    const msPerBeat = (60000 / tempos[measureIndex]) * factor;
    const startMs = clock;
    clock += m.durationBeats * msPerBeat;
    measures.push({ orderPos, measureIndex, startMs, endMs: clock, msPerBeat });
  });

  // Notes per measure, in score order (score.notes is sorted by startBeat then midi).
  const byMeasure = new Map<number, typeof score.notes>();
  for (const note of score.notes) {
    let list = byMeasure.get(note.measureIndex);
    if (!list) byMeasure.set(note.measureIndex, (list = []));
    list.push(note);
  }

  const notes: TimelineNote[] = [];
  for (const tm of measures) {
    const m = score.measures[tm.measureIndex];
    for (const note of byMeasure.get(tm.measureIndex) ?? []) {
      const startMs = tm.startMs + (note.startBeat - m.startBeat) * tm.msPerBeat;
      notes.push({ midi: note.midi, startMs, endMs: startMs + note.durationBeats * tm.msPerBeat, measureIndex: tm.measureIndex, orderPos: tm.orderPos });
    }
  }
  // Already ordered by measure then beat; sort defensively so consumers can rely on it.
  notes.sort((a, b) => a.startMs - b.startMs || a.midi - b.midi);

  return { notes, measures, totalMs: clock };
}

/** The performed measure playing at `ms`, or undefined past the end. */
export function measureAtMs(timeline: Timeline, ms: number): TimelineMeasure | undefined {
  if (ms < 0) return timeline.measures[0];
  // Binary search on startMs.
  let lo = 0, hi = timeline.measures.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timeline.measures[mid].startMs <= ms) lo = mid; else hi = mid - 1;
  }
  const m = timeline.measures[lo];
  return m && ms < m.endMs ? m : undefined;
}

/**
 * Where the cursor should be at `ms`: the measure and the offset into it in
 * quarter notes. Undefined once playback has passed the end.
 */
export function positionAtMs(timeline: Timeline, ms: number): { measureIndex: number; orderPos: number; beatInMeasure: number } | undefined {
  const m = measureAtMs(timeline, ms);
  if (!m) return undefined;
  return { measureIndex: m.measureIndex, orderPos: m.orderPos, beatInMeasure: Math.max(0, ms - m.startMs) / m.msPerBeat };
}

/**
 * The note sounding at `ms`: the last note that started at or before it.
 * Returns its index in `timeline.notes` plus where the cursor belongs, or
 * undefined before the first note. Chord notes share a start, so the index is
 * stable for the whole chord; callers compare indices to detect a new onset.
 */
export function soundingNoteAtMs(timeline: Timeline, ms: number): { index: number; measureIndex: number; beatInMeasure: number } | undefined {
  const notes = timeline.notes;
  if (!notes.length || ms < notes[0].startMs) return undefined;
  let lo = 0, hi = notes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (notes[mid].startMs <= ms) lo = mid; else hi = mid - 1;
  }
  // Step back to the first note of the chord so every position in the chord maps to one index.
  while (lo > 0 && notes[lo - 1].startMs === notes[lo].startMs) lo--;
  const n = notes[lo];
  const m = timeline.measures[n.orderPos];
  return { index: lo, measureIndex: n.measureIndex, beatInMeasure: (n.startMs - m.startMs) / m.msPerBeat };
}

/** Notes starting in [fromMs, toMs). The scheduler calls this once per tick. */
export function notesStartingBetween(timeline: Timeline, fromMs: number, toMs: number): TimelineNote[] {
  const out: TimelineNote[] = [];
  for (const n of timeline.notes) {
    if (n.startMs >= toMs) break;
    if (n.startMs >= fromMs) out.push(n);
  }
  return out;
}
