/**
 * Piano playback. Thin, typed facade over the native PianoSound module.
 * Load a SoundFont once, then play Standard MIDI File bytes through it.
 */
import type { EventSubscription } from 'expo-modules-core';

import PianoSoundModule from './src/PianoSoundModule';

export function isPianoLoaded(): boolean {
  return PianoSoundModule.isLoaded();
}

/** Loads the SoundFont at `path` into the sampler and starts audio. Cheap to repeat with the same path. */
export function loadPiano(path: string): Promise<void> {
  return PianoSoundModule.load(path);
}

/** Starts playing a MIDI file (base64). Any previous playback stops first. */
export function playMidi(midiBase64: string): Promise<void> {
  return PianoSoundModule.play(midiBase64);
}

export function stopPlayback(): void {
  PianoSoundModule.stop();
}

export function playbackPositionMs(): number {
  return PianoSoundModule.positionMs();
}

/** ~30 Hz while playing. */
export function addPositionListener(listener: (ms: number) => void): EventSubscription {
  return PianoSoundModule.addListener('onPosition', (e) => listener(e.ms));
}

/** Fires once when playback reaches the end, or when iOS interrupts it. */
export function addEndedListener(listener: () => void): EventSubscription {
  return PianoSoundModule.addListener('onEnded', listener);
}
