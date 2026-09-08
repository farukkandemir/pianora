export type MidiTransport = 'bluetooth' | 'usb' | 'network' | 'other';

export interface MidiSource {
  /** CoreMIDI unique ID. Stable for a given device across sessions. */
  id: number;
  name: string;
  manufacturer: string;
  transport: MidiTransport;
  isOffline: boolean;
}

interface MidiMessageBase {
  channel: number;
  sourceId: number;
  /** Milliseconds since device boot (mach host time). Use for relative timing only. */
  timestampMs: number;
}

export type MidiMessage =
  | (MidiMessageBase & { type: 'noteOn'; note: number; velocity: number })
  | (MidiMessageBase & { type: 'noteOff'; note: number; velocity: number })
  | (MidiMessageBase & { type: 'controlChange'; controller: number; value: number })
  | (MidiMessageBase & { type: 'other'; status: number; data1: number; data2: number });

export interface KnownBluetoothDevice {
  /** Stable peripheral identifier on this phone. */
  id: string;
  name: string;
}

export type BluetoothStatus = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'unavailable';

export interface BluetoothStatusEvent {
  status: BluetoothStatus;
  device?: KnownBluetoothDevice;
}

export type PianoMidiModuleEvents = {
  onMidiMessage: (message: MidiMessage) => void;
  onSourcesChanged: (event: { sources: MidiSource[] }) => void;
  onBluetoothStatus: (event: BluetoothStatusEvent) => void;
};
