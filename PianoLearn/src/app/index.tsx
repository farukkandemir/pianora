import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { pickSongFile } from '@/data/files';
import { deleteSong, importSong, ImportError, type SongListItem } from '@/data/songs';
import { useSongs } from '@/data/useSongs';

export default function LibraryScreen() {
  const router = useRouter();
  const { songs, error, refresh } = useSongs();
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onImport = useCallback(async () => {
    setBusy(true);
    try {
      const file = await pickSongFile();
      if (!file) return;
      const song = await importSong(file);
      await refresh();
      router.push({ pathname: '/song/[id]', params: { id: song.id } });
    } catch (e) {
      const msg = e instanceof ImportError ? e.message : `Import failed. ${e instanceof Error ? e.message : ''}`;
      Alert.alert('Could not import', msg);
    } finally {
      setBusy(false);
    }
  }, [refresh, router]);

  const onDelete = useCallback((song: SongListItem) => {
    Alert.alert('Delete song?', `"${song.title}" and its progress will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSong(song); refresh(); } },
    ]);
  }, [refresh]);

  return (
    <View style={styles.container}>
      {songs === null ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : songs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No songs yet</Text>
          <Text style={styles.muted}>Import a MusicXML file (.musicxml, .xml or .mxl) to start practicing.</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/song/[id]', params: { id: item.id } })}
              onLongPress={() => onDelete(item)}
              style={styles.row}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>
                {item.composer ?? 'Unknown composer'} · {item.totalMeasures} measures
              </Text>
              <Text style={styles.muted}>
                {item.progress ? `Last practiced: measure ${item.progress.lastMeasure + 1}` : 'Not started'}
              </Text>
            </Pressable>
          )}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={onImport} disabled={busy} style={[styles.btn, busy && styles.btnDisabled]}>
        <Text style={styles.btnText}>{busy ? 'Importing…' : 'Import song'}</Text>
      </Pressable>
      <Link href="/midi-setup" style={styles.link}>MIDI setup</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', gap: 2 },
  title: { fontSize: 17, fontWeight: '600' },
  muted: { color: '#777', fontSize: 13, textAlign: 'center' },
  error: { color: '#b00020', marginTop: 8 },
  btn: { backgroundColor: '#2f80ed', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#2f80ed', textAlign: 'center', marginTop: 14, marginBottom: 8 },
});
