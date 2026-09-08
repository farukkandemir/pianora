/**
 * Song files live in <Documents>/songs/<id>.<ext>. We store only the file
 * name in the database, never the absolute path: iOS moves the app container
 * between installs, so absolute paths go stale.
 */
import { Directory, File, Paths } from 'expo-file-system';

function songsDir(): Directory {
  const dir = new Directory(Paths.document, 'songs');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function songFile(fileName: string): File {
  return new File(songsDir(), fileName);
}

/** Copies a picked file into the library under a stable name. */
export function storeSongFile(source: File, id: string): string {
  const ext = (source.extension || '.xml').replace(/^\./, '').toLowerCase();
  const fileName = `${id}.${ext}`;
  source.copy(songFile(fileName));
  return fileName;
}

export async function readSongBytes(fileName: string): Promise<Uint8Array> {
  return songFile(fileName).bytes();
}

export function deleteSongFile(fileName: string): void {
  const f = songFile(fileName);
  if (f.exists) f.delete();
}

/** Opens the system file picker. Returns null if the user cancels. */
export async function pickSongFile(): Promise<File | null> {
  // No MIME filter: iOS maps MusicXML types unreliably and would grey out
  // valid files. We validate by parsing instead.
  const result = await File.pickFileAsync();
  return result.canceled ? null : result.result;
}
