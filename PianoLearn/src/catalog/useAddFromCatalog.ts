/**
 * Add a catalogue piece to the library. The bundled .mxl is resolved through
 * expo-asset (a file inside the app bundle on device), then goes through the
 * same import as a picked file. Web analogy: fetch a static asset, then POST
 * it to the same endpoint the upload form uses.
 */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { importSong, ImportError, type SongRecord } from '@/data/songs';
import type { CatalogEntry } from './catalog';

export function useAddFromCatalog() {
  const [busyId, setBusyId] = useState<string | null>(null);

  const add = useCallback(async (entry: CatalogEntry): Promise<SongRecord | null> => {
    setBusyId(entry.id);
    try {
      const asset = Asset.fromModule(entry.asset);
      await asset.downloadAsync();
      if (!asset.localUri) throw new ImportError('corrupt');
      return await importSong(new File(asset.localUri), { catalogId: entry.id, title: entry.title, composer: entry.composer });
    } catch (e) {
      Alert.alert('Could not add piece', e instanceof ImportError ? e.message : 'Something went wrong while adding this piece.');
      return null;
    } finally {
      setBusyId(null);
    }
  }, []);

  return { add, busyId };
}
