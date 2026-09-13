import { useCallback, useEffect, useState } from 'react';

import { onCoverChange } from './covers';
import { listSongs, type SongListItem } from './songs';

/** Library list with a manual refresh; screens call refresh after mutations. */
export function useSongs() {
  const [songs, setSongs] = useState<SongListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSongs(await listSongs());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    return onCoverChange(() => { void refresh(); });
  }, [refresh]);

  return { songs, error, refresh };
}
