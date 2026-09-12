import { NativeModule, requireNativeModule } from 'expo';

export type PianoSoundEvents = {
  onPosition: (e: { ms: number }) => void;
  onEnded: () => void;
};

declare class PianoSoundModule extends NativeModule<PianoSoundEvents> {
  isLoaded(): boolean;
  load(path: string): Promise<void>;
  play(midiBase64: string): Promise<void>;
  stop(): void;
  positionMs(): number;
  unload(): void;
}

export default requireNativeModule<PianoSoundModule>('PianoSound');
