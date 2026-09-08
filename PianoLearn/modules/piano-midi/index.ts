/**
 * MIDI input. Thin, typed facade over the native PianoMidi module.
 */
import type { EventSubscription } from 'expo-modules-core';

import type { BluetoothStatusEvent, KnownBluetoothDevice, MidiMessage, MidiSource } from './src/PianoMidi.types';
import PianoMidiModule from './src/PianoMidiModule';

export type { BluetoothStatus, BluetoothStatusEvent, KnownBluetoothDevice, MidiMessage, MidiSource, MidiTransport } from './src/PianoMidi.types';

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

/** Bluetooth keyboards paired before on this phone. */
export function listKnownDevices(): KnownBluetoothDevice[] {
  return PianoMidiModule.listKnownDevices();
}

/**
 * Ask iOS to reconnect to every known Bluetooth keyboard. Resolves at once;
 * results arrive through addBluetoothStatusListener and addSourcesListener.
 * A pending request stays alive, so a keyboard switched on later connects too.
 */
export function reconnectKnownDevices(): Promise<void> {
  return PianoMidiModule.reconnectKnownDevices();
}

export function forgetKnownDevice(id: string): void {
  PianoMidiModule.forgetKnownDevice(id);
}

export function addBluetoothStatusListener(listener: (e: BluetoothStatusEvent) => void): EventSubscription {
  return PianoMidiModule.addListener('onBluetoothStatus', listener);
}
