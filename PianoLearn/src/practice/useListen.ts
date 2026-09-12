/**
 * "Listen": play the whole piece through the piano sampler while the caller
 * moves the score cursor from the reported position. Owns the SoundFont
 * download and load, so the button can show "Listen", a download percentage,
 * or "Stop".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildMidiFile, toBase64 } from '@/engine/midiFile';
import type { Score } from '@/engine/model';
import { buildTimeline, type Timeline } from '@/engine/timeline';
import { downloadSoundfont, isSoundfontReady, soundfontFile, type DownloadHandle } from '@/sound/soundfont';
import { addEndedListener, addPositionListener, loadPiano, playMidi, stopPlayback } from '../../modules/piano-sound';

export type ListenState =
  | { kind: 'idle' }
  | { kind: 'downloading'; progress: number }
  | { kind: 'loading' }
  | { kind: 'playing' }
  | { kind: 'error'; message: string };

export interface Listen {
  state: ListenState;
  timeline: Timeline;
  /** Starts from the first bar; stops when tapped again or at the end. */
  toggle: () => void;
  stop: () => void;
}

export function useListen(score: Score, tempoPercent: number, onPosition: (ms: number) => void): Listen {
  const [state, setState] = useState<ListenState>({ kind: 'idle' });
  const timeline = useMemo(() => buildTimeline(score, tempoPercent), [score, tempoPercent]);
  const download = useRef<DownloadHandle | null>(null);
  const positionRef = useRef(onPosition);
  positionRef.current = onPosition;

  const stop = useCallback(() => {
    download.current?.cancel();
    download.current = null;
    stopPlayback();
    setState({ kind: 'idle' });
  }, []);

  useEffect(() => {
    const pos = addPositionListener((ms) => positionRef.current(ms));
    const end = addEndedListener(() => setState({ kind: 'idle' }));
    return () => { pos.remove(); end.remove(); stopPlayback(); };
  }, []);

  const start = useCallback(async () => {
    try {
      if (!isSoundfontReady()) {
        setState({ kind: 'downloading', progress: 0 });
        const handle = downloadSoundfont((p) => setState({ kind: 'downloading', progress: p }));
        download.current = handle;
        await handle.done;
        download.current = null;
      }
      setState({ kind: 'loading' });
      await loadPiano(soundfontFile().uri.replace(/^file:\/\//, ''));
      await playMidi(toBase64(buildMidiFile(timeline)));
      setState({ kind: 'playing' });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // A cancelled download is the user tapping Stop, not an error.
      if (/abort/i.test(message)) { setState({ kind: 'idle' }); return; }
      setState({ kind: 'error', message });
    }
  }, [timeline]);

  const toggle = useCallback(() => {
    if (state.kind === 'idle' || state.kind === 'error') void start(); else stop();
  }, [state.kind, start, stop]);

  return { state, timeline, toggle, stop };
}
