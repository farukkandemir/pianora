import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ContinueCard } from '@/components/library/ContinueCard';
import { SongArt } from '@/components/library/SongArt';
import { pickSongFile } from '@/data/files';
import { deleteSong, importSong, ImportError, type SongListItem } from '@/data/songs';
import { useSongs } from '@/data/useSongs';
import { displayComposer } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, Card, Icon, IconButton, Screen, Text } from '@/ui';

export default function LibraryScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { songs, error, refresh } = useSongs();
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const open = useCallback((song: SongListItem) => {
    router.push({ pathname: '/song/[id]', params: { id: song.id } });
  }, [router]);

  const onImport = useCallback(async () => {
    setBusy(true);
    try {
      const file = await pickSongFile();
      if (!file) return;
      const song = await importSong(file);
      await refresh();
      router.push({ pathname: '/song/[id]', params: { id: song.id } });
    } catch (e) {
      const msg = e instanceof ImportError ? e.message : 'Something went wrong while importing.';
      Alert.alert('Could not import', msg);
    } finally {
      setBusy(false);
    }
  }, [refresh, router]);

  const onDelete = useCallback((song: SongListItem) => {
    Alert.alert('Delete piece?', `"${song.title}" and its progress will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSong(song); refresh(); } },
    ]);
  }, [refresh]);

  // Hero = most recently practiced piece; "recent" = the rest with progress, newest first.
  const { hero, recent } = useMemo(() => {
    const list = songs ?? [];
    const practiced = list.filter((s) => s.progress).sort((a, b) => b.progress!.updatedAt - a.progress!.updatedAt);
    return { hero: practiced[0] ?? null, recent: practiced.slice(1, 4) };
  }, [songs]);

  const header = (
    <View style={[styles.header, { paddingBottom: spacing.xxl }]}>
      <Text variant="title">Library</Text>
      <IconButton
        icon={<Icon name="plus" size={20} tone="onInk" />}
        variant="ink"
        size={42}
        accessibilityLabel="Add music"
        onPress={onImport}
        disabled={busy}
      />
    </View>
  );

  if (songs === null) {
    return <Screen>{header}</Screen>;
  }

  if (songs.length === 0) {
    return (
      <Screen>
        {header}
        <View style={[styles.empty, { gap: spacing.md, paddingTop: spacing.xxxl }]}>
          <SongArt songId="empty" height={220} radius={radius.xl} />
          <Text variant="heading" style={{ paddingTop: spacing.md }}>Bring your own sheet music</Text>
          <Text tone="muted">Any MusicXML file works. Export one from MuseScore, Sibelius or Finale, or find free scores on MuseScore and IMSLP.</Text>
          <Button label="Choose a file" variant="accent" block onPress={onImport} disabled={busy} style={{ marginTop: spacing.sm }} />
          <Text variant="caption" tone="faint" center>.musicxml · .xml · .mxl</Text>
        </View>
        {error ? <Text tone="accent">{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen inset={false}>
      <View style={{ paddingHorizontal: spacing.screen }}>
        {header}
        {hero ? <ContinueCard song={hero} onPress={() => open(hero)} /> : null}
      </View>

      <View style={[styles.sectionHead, { paddingHorizontal: spacing.screen, paddingTop: spacing.xxl, paddingBottom: spacing.md }]}>
        <Text variant="subheading">Your pieces</Text>
        <Text variant="caption" tone="muted">{songs.length} {songs.length === 1 ? 'piece' : 'pieces'}</Text>
      </View>
      <FlatList
        horizontal
        data={songs}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} onLongPress={() => onDelete(item)} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <SongArt songId={item.id} width={120} height={120} radius={radius.lg} />
            <Text variant="bodyStrong" numberOfLines={1} style={{ paddingTop: spacing.sm }}>{item.title}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>{displayComposer(item.composer)}</Text>
          </Pressable>
        )}
      />

      {recent.length > 0 ? (
        <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.xxl, gap: spacing.md }}>
          <Text variant="subheading">Recently played</Text>
          <View style={{ gap: spacing.sm }}>
            {recent.map((s) => (
              <Pressable key={s.id} onPress={() => open(s)} onLongPress={() => onDelete(s)} style={({ pressed }) => pressed && styles.pressed}>
                <Card padding={spacing.md} style={styles.row}>
                  <SongArt songId={s.id} width={40} height={40} radius={radius.sm} />
                  <View style={styles.rowText}>
                    <Text variant="bodyStrong" numberOfLines={1}>{s.title}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {displayComposer(s.composer)} · Bar {(s.progress?.lastMeasure ?? 0) + 1} of {s.totalMeasures}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} tone="faint" />
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {error ? <Text tone="accent" style={{ paddingHorizontal: spacing.screen, color: colors.wrong }}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { alignItems: 'stretch' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  tile: { width: 120 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
});
