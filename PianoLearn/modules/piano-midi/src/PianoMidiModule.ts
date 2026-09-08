import { NativeModule, requireNativeModule } from 'expo';

import { MidiSource, PianoMidiModuleEvents } from './PianoMidi.types';

declare class PianoMidiModule extends NativeModule<PianoMidiModuleEvents> {
  listSources(): MidiSource[];
  showBluetoothPairing(): Promise<void>;
}

export default requireNativeModule<PianoMidiModule>('PianoMidi');
