/**
 * Pick a MusicXML file and import it. Shared by the Add Music screen and the
 * Library's empty state. Import errors are shown to the user here; callers
 * only see the new song, or null when nothing was imported.
 */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { requestCover } from './covers';
import { pickSongFile } from './files';
import { importSong, ImportError, type SongRecord } from './songs';

export function useImportSong() {
  const [busy, setBusy] = useState(false);

  const importFromPicker = useCallback(async (): Promise<SongRecord | null> => {
    setBusy(true);
    try {
      const file = await pickSongFile();
      if (!file) return null;
      const song = await importSong(file);
      requestCover(song);
      return song;
    } catch (e) {
      Alert.alert('Could not import', e instanceof ImportError ? e.message : 'Something went wrong while importing.');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { importFromPicker, busy };
}
