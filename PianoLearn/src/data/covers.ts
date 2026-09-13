/**
 * Cover images. After a piece is imported we ask the server for its cover,
 * download the image next to the score, and record the file name on the song.
 * The request runs in the background: the library shows the placeholder art
 * until the cover lands, then refreshes through `onCoverChange`.
 * Nothing here throws to the caller; a missing cover is never an error the
 * user has to deal with.
 */
import { fetch } from 'expo/fetch';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './backend';
import { downloadCoverFile } from './files';
import { getInstallId } from './installId';
import { setSongCover, type SongRecord } from './songs';

type Listener = (songId: string) => void;
const listeners = new Set<Listener>();

/** Subscribe to "a cover arrived for this song". Returns the unsubscribe. */
export function onCoverChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const inFlight = new Set<string>();

/** Fire and forget. Safe to call twice for the same song. */
export function requestCover(song: SongRecord): void {
  if (song.coverFile || inFlight.has(song.id)) return;
  inFlight.add(song.id);
  fetchCover(song)
    .catch((e) => { if (__DEV__) console.warn('cover request failed', song.title, e); })
    .finally(() => { inFlight.delete(song.id); });
}

async function fetchCover(song: SongRecord): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/cover`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'x-install-id': await getInstallId(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ title: song.title, composer: song.composer }),
  });
  if (!res.ok) throw new Error(`cover ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { url } = (await res.json()) as { url: string };
  const fileName = await downloadCoverFile(url, song.id);
  // The piece may have been deleted while the image was on its way.
  if (await setSongCover(song.id, fileName)) listeners.forEach((l) => l(song.id));
}
