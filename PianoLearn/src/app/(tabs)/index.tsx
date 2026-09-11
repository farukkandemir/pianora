import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContinueCard } from '@/components/library/ContinueCard';
import { SongArt } from '@/components/library/SongArt';
import { deleteSong, type SongListItem } from '@/data/songs';
import { useImportSong } from '@/data/useImportSong';
import { useSongs } from '@/data/useSongs';
import { displayComposer } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, Card, Icon, IconButton, Screen, Text, useCurtain } from '@/ui';

export default function LibraryScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { width } = useWindowDimensions();
  // Tiles and thumbnails scale with the screen: the Paper design is drawn at
  // 390pt with 120pt tiles and 40pt thumbnails; phones here are 402-430pt.
  const tile = Math.round(Math.min(184, Math.max(156, width * 0.41)));
  const thumb = Math.round(Math.min(64, Math.max(56, width * 0.145)));
  const { songs, error, refresh } = useSongs();
  const curtain = useCurtain();
  const { importFromPicker, busy } = useImportSong();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Practice opens as a landscape modal; the curtain hides the rotation.
  const openSong = useCallback(async (id: string) => {
    await curtain.raise();
    router.push({ pathname: '/song/[id]', params: { id } });
  }, [curtain, router]);
  const open = useCallback((song: SongListItem) => { void openSong(song.id); }, [openSong]);

  // Empty library: import right here. Otherwise the "+" opens Add music.
  const onImport = useCallback(async () => {
    const song = await importFromPicker();
    if (!song) return;
    await refresh();
    await openSong(song.id);
  }, [importFromPicker, openSong, refresh]);

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
        variant="accent"
        size={42}
        accessibilityLabel="Add music"
        onPress={() => router.push('/add-music')}
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
        <Text variant="section">Your pieces</Text>
        <Text variant="caption" tone="muted">{songs.length} {songs.length === 1 ? 'piece' : 'pieces'}</Text>
      </View>
      <FlatList
        horizontal
        data={songs}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} onLongPress={() => onDelete(item)} style={({ pressed }) => [{ width: tile }, pressed && styles.pressed]}>
            <SongArt songId={item.id} width={tile} height={tile} radius={radius.lg} />
            <Text variant="bodyStrong" numberOfLines={2} style={{ paddingTop: spacing.sm }}>{item.title}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>{displayComposer(item.composer)}</Text>
          </Pressable>
        )}
      />

      {recent.length > 0 ? (
        <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.xxl, gap: spacing.md }}>
          <Text variant="section">Recently played</Text>
          <View style={{ gap: spacing.sm }}>
            {recent.map((s) => (
              <Pressable key={s.id} onPress={() => open(s)} onLongPress={() => onDelete(s)} style={({ pressed }) => pressed && styles.pressed}>
                <Card padding={spacing.lg} style={styles.row}>
                  <SongArt songId={s.id} width={thumb} height={thumb} radius={radius.sm} />
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
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
});
