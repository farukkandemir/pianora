/**
 * Wait Mode: the score waits for the user to play the expected notes before
 * advancing. Pure state machine; feed it MIDI note-on/off, read back state.
 */
import { PracticeEvent, firstEventInMeasure } from './events';
import { MeasureRange } from './model';

export type NoteVerdict = 'correct' | 'wrong' | 'ignored';

export interface NoteOnResult {
  verdict: NoteVerdict;
  /** True if this note-on completed the current event and the cursor moved. */
  advanced: boolean;
  /** True if the song (or loop) finished with this note. Loops wrap instead. */
  finished: boolean;
  /** Index of the event that is current after processing this note. */
  eventIndex: number;
}

export interface WaitModeState {
  eventIndex: number;
  /** MIDI numbers still needed to satisfy the current event. */
  remaining: number[];
  /** MIDI numbers of the current event already satisfied. */
  satisfied: number[];
  /** Wrong MIDI numbers currently held down. */
  wrongHeld: number[];
  /** All MIDI numbers currently held down. */
  held: number[];
  finished: boolean;
}

export interface WaitModeOptions {
  loop?: MeasureRange;
  /**
   * If true, a wrong note clears the notes already satisfied for a chord,
   * so the user has to re-strike the whole chord. Default false (lenient).
   */
  strictChords?: boolean;
}

export class WaitModeSession {
  private events: PracticeEvent[];
  private idx = 0;
  private satisfied = new Set<number>();
  private held = new Set<number>();
  private wrongHeld = new Set<number>();
  private loop?: MeasureRange;
  private strictChords: boolean;
  private done = false;

  constructor(events: PracticeEvent[], opts: WaitModeOptions = {}) {
    this.events = events;
    this.loop = opts.loop;
    this.strictChords = opts.strictChords ?? false;
    if (this.loop) this.idx = firstEventInMeasure(events, this.loop.start);
    this.done = this.idx >= events.length;
  }

  get current(): PracticeEvent | undefined {
    return this.events[this.idx];
  }

  get state(): WaitModeState {
    const cur = this.current;
    const remaining = cur ? cur.midis.filter((m) => !this.satisfied.has(m)) : [];
    return {
      eventIndex: this.idx,
      remaining,
      satisfied: [...this.satisfied].sort((a, b) => a - b),
      wrongHeld: [...this.wrongHeld].sort((a, b) => a - b),
      held: [...this.held].sort((a, b) => a - b),
      finished: this.done,
    };
  }

  setLoop(loop: MeasureRange | undefined): void {
    this.loop = loop;
    if (loop) {
      const cur = this.current;
      if (!cur || cur.measureIndex < loop.start || cur.measureIndex > loop.end) {
        this.jumpToEvent(firstEventInMeasure(this.events, loop.start));
      }
    }
  }

  jumpToMeasure(measureIndex: number): void {
    this.jumpToEvent(firstEventInMeasure(this.events, measureIndex));
  }

  jumpToEvent(index: number): void {
    this.idx = Math.max(0, Math.min(index, this.events.length));
    this.satisfied.clear();
    this.wrongHeld.clear();
    this.done = this.idx >= this.events.length;
  }

  restart(): void {
    this.jumpToEvent(this.loop ? firstEventInMeasure(this.events, this.loop.start) : 0);
  }

  noteOn(midi: number): NoteOnResult {
    this.held.add(midi);
    const cur = this.current;
    if (!cur || this.done) {
      return { verdict: 'ignored', advanced: false, finished: this.done, eventIndex: this.idx };
    }

    if (!cur.midis.includes(midi)) {
      this.wrongHeld.add(midi);
      if (this.strictChords) this.satisfied.clear();
      return { verdict: 'wrong', advanced: false, finished: false, eventIndex: this.idx };
    }

    this.satisfied.add(midi);
    const complete = cur.midis.every((m) => this.satisfied.has(m));
    if (!complete) {
      return { verdict: 'correct', advanced: false, finished: false, eventIndex: this.idx };
    }

    this.advance();
    return { verdict: 'correct', advanced: true, finished: this.done, eventIndex: this.idx };
  }

  noteOff(midi: number): void {
    this.held.delete(midi);
    this.wrongHeld.delete(midi);
  }

  private advance(): void {
    this.satisfied.clear();
    this.wrongHeld.clear();
    this.idx += 1;

    if (this.loop) {
      const next = this.events[this.idx];
      if (!next || next.measureIndex > this.loop.end) {
        this.idx = firstEventInMeasure(this.events, this.loop.start);
      }
      this.done = false;
      return;
    }
    this.done = this.idx >= this.events.length;
  }
}
