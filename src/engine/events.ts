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
  const events: PracticeEvent[] = [];
  let current: PracticeEvent | undefined;

  for (const note of score.notes) {
    if (!noteMatchesHand(note, handMode)) continue;
    if (range && (note.measureIndex < range.start || note.measureIndex > range.end)) continue;

    if (current && Math.abs(current.startBeat - note.startBeat) < EPS) {
      current.notes.push(note);
      if (!current.midis.includes(note.midi)) current.midis.push(note.midi);
    } else {
      current = {
        index: events.length,
        startBeat: note.startBeat,
        measureIndex: note.measureIndex,
        notes: [note],
        midis: [note.midi],
      };
      events.push(current);
    }
  }
  for (const e of events) e.midis.sort((a, b) => a - b);
  return events;
}

/** First event index at or after the given measure, or events.length if none. */
export function firstEventInMeasure(events: PracticeEvent[], measureIndex: number): number {
  const i = events.findIndex((e) => e.measureIndex >= measureIndex);
  return i === -1 ? events.length : i;
}
