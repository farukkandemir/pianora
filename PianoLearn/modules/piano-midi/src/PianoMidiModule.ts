import { NativeModule, requireNativeModule } from 'expo';

import { KnownBluetoothDevice, MidiSource, PianoMidiModuleEvents } from './PianoMidi.types';

declare class PianoMidiModule extends NativeModule<PianoMidiModuleEvents> {
  listSources(): MidiSource[];
  showBluetoothPairing(): Promise<void>;
  listKnownDevices(): KnownBluetoothDevice[];
  reconnectKnownDevices(): Promise<void>;
  forgetKnownDevice(id: string): void;
}

export default requireNativeModule<PianoMidiModule>('PianoMidi');
