/**
 * Glues MIDI input to the Wait Mode engine and exposes React state for the
 * practice screen. Engine stays pure; this hook owns subscriptions and
 * re-renders.
 *
 * Invariant: `events` and `state` are always published together, so no render
 * can see a step index from one event list applied to another. That is what
 * keeps the sheet cursor from flickering when hand mode or loop changes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { buildEvents, type PracticeEvent } from '@/engine/events';
import type { HandMode, MeasureRange, Score } from '@/engine/model';
import { WaitModeSession, type NoteOnResult, type WaitModeState } from '@/engine/waitMode';
import { addMidiListener } from '../../modules/piano-midi';

export interface PracticeSettings {
  handMode: HandMode;
  loop: MeasureRange | null;
}

export interface PracticeSession {
  events: PracticeEvent[];
  current: PracticeEvent | undefined;
  state: WaitModeState;
  lastResult: NoteOnResult | null;
  noteOn: (midi: number) => void;
  noteOff: (midi: number) => void;
  restart: () => void;
  jumpToMeasure: (measureIndex: number) => void;
}

interface Snapshot {
  session: WaitModeSession;
  events: PracticeEvent[];
  state: WaitModeState;
  lastResult: NoteOnResult | null;
}

function createSnapshot(score: Score, settings: PracticeSettings, startMeasure: number): Snapshot {
  const events = buildEvents(score, settings.handMode);
  const session = new WaitModeSession(events, { loop: settings.loop ?? undefined });
  if (!settings.loop) session.jumpToMeasure(startMeasure);
  return { session, events, state: session.state, lastResult: null };
}

export function usePracticeSession(score: Score, settings: PracticeSettings, startMeasure: number): PracticeSession {
  const [snap, setSnap] = useState<Snapshot>(() => createSnapshot(score, settings, startMeasure));
  // The live engine instance. Mutated only outside React state updaters, so
  // updaters stay pure (React may invoke them more than once in development).
  const sessionRef = useRef(snap.session);

  // Rebuild synchronously during render when the inputs change, keeping the
  // user's place by measure. Publishing events+state in one setState call is
  // what prevents a mismatched frame.
  const inputs = useRef({ score, handMode: settings.handMode, loop: settings.loop });
  if (
    inputs.current.score !== score ||
    inputs.current.handMode !== settings.handMode ||
    inputs.current.loop !== settings.loop
  ) {
    inputs.current = { score, handMode: settings.handMode, loop: settings.loop };
    const keepMeasure = sessionRef.current.current?.measureIndex ?? startMeasure;
    const next = createSnapshot(score, settings, keepMeasure);
    sessionRef.current = next.session;
    setSnap(next);
  }

  /** Publish the engine's current state for the session it belongs to. */
  const publish = useCallback((session: WaitModeSession, lastResult: NoteOnResult | null) => {
    setSnap((prev) => (prev.session === session ? { ...prev, state: session.state, lastResult } : prev));
  }, []);

  const noteOn = useCallback((midi: number) => {
    const s = sessionRef.current;
    publish(s, s.noteOn(midi));
  }, [publish]);

  const noteOff = useCallback((midi: number) => {
    const s = sessionRef.current;
    s.noteOff(midi);
    setSnap((prev) => (prev.session === s ? { ...prev, state: s.state } : prev));
  }, []);

  useEffect(() => {
    const sub = addMidiListener((m) => {
      if (m.type === 'noteOn') noteOn(m.note);
      else if (m.type === 'noteOff') noteOff(m.note);
    });
    return () => sub.remove();
  }, [noteOn, noteOff]);

  const restart = useCallback(() => {
    const s = sessionRef.current;
    s.restart();
    publish(s, null);
  }, [publish]);

  const jumpToMeasure = useCallback((measureIndex: number) => {
    const s = sessionRef.current;
    s.jumpToMeasure(measureIndex);
    publish(s, null);
  }, [publish]);

  return {
    events: snap.events,
    current: snap.events[snap.state.eventIndex],
    state: snap.state,
    lastResult: snap.lastResult,
    noteOn,
    noteOff,
    restart,
    jumpToMeasure,
  };
}
