/**
 * Turns a Score into the ordered list of "things the user must play".
 * Notes with the same onset form one event (a chord, or both hands together).
 */
import { HandMode, MeasureRange, Note, Score } from './model';

const EPS = 1e-6;

export interface PracticeEvent {
  /** Position in the event list. */
  index: number;
  startBeat: number;
  measureIndex: number;
  /** Position of this measure occurrence in score.playbackOrder. */
  orderPos: number;
  /** 1 for the first time through this measure, 2 for a repeat, ... */
  pass: number;
  notes: Note[];
  /** Distinct MIDI numbers required. */
  midis: number[];
}

export function noteMatchesHand(note: Note, mode: HandMode): boolean {
  if (mode === 'both') return true;
  if (note.hand === 'unknown') return true;
  return note.hand === mode;
}

export function buildEvents(score: Score, handMode: HandMode = 'both', range?: MeasureRange): PracticeEvent[] {
  // Notes per measure, already sorted by startBeat then midi (score.notes is).
  const byMeasure = new Map<number, Note[]>();
  for (const note of score.notes) {
    if (!noteMatchesHand(note, handMode)) continue;
    let list = byMeasure.get(note.measureIndex);
    if (!list) byMeasure.set(note.measureIndex, (list = []));
    list.push(note);
  }

  const events: PracticeEvent[] = [];
  const passes = new Map<number, number>();
  const order = score.playbackOrder.length ? score.playbackOrder : score.measures.map((m) => m.index);

  order.forEach((measureIndex, orderPos) => {
    const pass = (passes.get(measureIndex) ?? 0) + 1;
    passes.set(measureIndex, pass);
    if (range && (measureIndex < range.start || measureIndex > range.end)) return;

    let current: PracticeEvent | undefined;
    for (const note of byMeasure.get(measureIndex) ?? []) {
      if (current && Math.abs(current.startBeat - note.startBeat) < EPS) {
        current.notes.push(note);
        if (!current.midis.includes(note.midi)) current.midis.push(note.midi);
      } else {
        current = { index: events.length, startBeat: note.startBeat, measureIndex, orderPos, pass, notes: [note], midis: [note.midi] };
        events.push(current);
      }
    }
  });
  for (const e of events) e.midis.sort((a, b) => a - b);
  return events;
}

/**
 * First event at or after the first occurrence of a measure in performed
 * order, or events.length if none.
 */
export function firstEventInMeasure(events: PracticeEvent[], measureIndex: number): number {
  const exact = events.findIndex((e) => e.measureIndex === measureIndex);
  if (exact !== -1) return exact;
  // Measure has no events (rests, or filtered hand): take the next one in order.
  const i = events.findIndex((e) => e.measureIndex > measureIndex && e.pass === 1);
  return i === -1 ? events.length : i;
}
