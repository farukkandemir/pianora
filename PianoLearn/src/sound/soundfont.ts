/**
 * The piano SoundFont is not bundled: the app downloads it once from the
 * `pianolearn-sounds` bucket into the Documents folder and reuses it forever.
 * See scripts/sound/README.md for how the file is built.
 */
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';

/** Public URL of the bucket object. Set after the upload; empty means "not configured". */
export const SOUNDFONT_URL = 'https://sounds.pianolearn.app/salamander-8v.sf2';
export const SOUNDFONT_FILE = 'salamander-8v.sf2';
/** Exact size of the published file, used to detect a partial download. */
export const SOUNDFONT_BYTES = 287_029_056;

export function soundfontFile(): File {
  return new File(Paths.document, 'sounds', SOUNDFONT_FILE);
}

/** True when the complete file is on disk. */
export function isSoundfontReady(): boolean {
  const f = soundfontFile();
  return f.exists && f.size === SOUNDFONT_BYTES;
}

export interface DownloadHandle {
  done: Promise<File>;
  cancel(): void;
}

/**
 * Downloads the SoundFont, reporting progress 0..1. A partial file from an
 * earlier attempt is discarded first.
 */
export function downloadSoundfont(onProgress: (fraction: number) => void): DownloadHandle {
  if (!SOUNDFONT_URL) throw new Error('The piano sound is not configured yet.');
  const dir = new Directory(Paths.document, 'sounds');
  if (!dir.exists) dir.create({ intermediates: true });
  const target = soundfontFile();
  if (target.exists) target.delete();
  const controller = new AbortController();
  const task = new DownloadTask(SOUNDFONT_URL, target, {
    signal: controller.signal,
    onProgress: ({ bytesWritten, totalBytes }) => {
      const total = totalBytes > 0 ? totalBytes : SOUNDFONT_BYTES;
      onProgress(Math.min(1, bytesWritten / total));
    },
  });
  const done = task.downloadAsync().then((file) => {
    task.release();
    if (!file || file.size !== SOUNDFONT_BYTES) {
      file?.delete();
      throw new Error('The piano sound did not download completely. Try again.');
    }
    return file;
  });
  return { done, cancel: () => controller.abort() };
}
