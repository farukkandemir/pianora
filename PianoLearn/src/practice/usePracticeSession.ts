/**
 * Glues MIDI input to the Wait Mode engine and exposes React state for the
 * practice screen. Engine stays pure; this hook owns subscriptions and
 * re-renders.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

export function usePracticeSession(score: Score, settings: PracticeSettings, startMeasure: number): PracticeSession {
  const events = useMemo(() => buildEvents(score, settings.handMode), [score, settings.handMode]);

  const sessionRef = useRef<WaitModeSession | null>(null);
  const [state, setState] = useState<WaitModeState>(() => emptyState());
  const [lastResult, setLastResult] = useState<NoteOnResult | null>(null);

  // (Re)create the session when the event list or loop changes, keeping the
  // user's position by measure rather than by event index.
  useEffect(() => {
    const prev = sessionRef.current?.current?.measureIndex ?? startMeasure;
    const s = new WaitModeSession(events, { loop: settings.loop ?? undefined });
    if (!settings.loop) s.jumpToMeasure(prev);
    sessionRef.current = s;
    setState(s.state);
    setLastResult(null);
    // startMeasure only seeds the very first session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, settings.loop]);

  const noteOn = useCallback((midi: number) => {
    const s = sessionRef.current;
    if (!s) return;
    const r = s.noteOn(midi);
    setLastResult(r);
    setState(s.state);
  }, []);

  const noteOff = useCallback((midi: number) => {
    const s = sessionRef.current;
    if (!s) return;
    s.noteOff(midi);
    setState(s.state);
  }, []);

  useEffect(() => {
    const sub = addMidiListener((m) => {
      if (m.type === 'noteOn') noteOn(m.note);
      else if (m.type === 'noteOff') noteOff(m.note);
    });
    return () => sub.remove();
  }, [noteOn, noteOff]);

  const restart = useCallback(() => {
    sessionRef.current?.restart();
    if (sessionRef.current) setState(sessionRef.current.state);
    setLastResult(null);
  }, []);

  const jumpToMeasure = useCallback((measureIndex: number) => {
    sessionRef.current?.jumpToMeasure(measureIndex);
    if (sessionRef.current) setState(sessionRef.current.state);
    setLastResult(null);
  }, []);

  return {
    events,
    current: events[state.eventIndex],
    state,
    lastResult,
    noteOn,
    noteOff,
    restart,
    jumpToMeasure,
  };
}

function emptyState(): WaitModeState {
  return { eventIndex: 0, remaining: [], satisfied: [], wrongHeld: [], held: [], finished: false };
}
