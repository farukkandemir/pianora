/**
 * MIDI input. Thin, typed facade over the native PianoMidi module.
 */
import type { EventSubscription } from 'expo-modules-core';

import type { MidiMessage, MidiSource } from './src/PianoMidi.types';
import PianoMidiModule from './src/PianoMidiModule';

export type { MidiMessage, MidiSource, MidiTransport } from './src/PianoMidi.types';

export function listSources(): MidiSource[] {
  return PianoMidiModule.listSources();
}

/** Presents the iOS Bluetooth MIDI pairing sheet. Resolves when it closes. */
export function showBluetoothPairing(): Promise<void> {
  return PianoMidiModule.showBluetoothPairing();
}

export function addMidiListener(listener: (message: MidiMessage) => void): EventSubscription {
  return PianoMidiModule.addListener('onMidiMessage', listener);
}

export function addSourcesListener(listener: (sources: MidiSource[]) => void): EventSubscription {
  return PianoMidiModule.addListener('onSourcesChanged', (e) => listener(e.sources));
}
