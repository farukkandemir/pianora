import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContinueCard } from '@/components/library/ContinueCard';
import { SheetIllustration } from '@/components/library/SheetIllustration';
import { SongArt } from '@/components/library/SongArt';
import { deleteSong, type SongListItem } from '@/data/songs';
import { useImportSong } from '@/data/useImportSong';
import { useSongs } from '@/data/useSongs';
import { composerSurname } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, Icon, IconButton, Screen, Text, useCurtain } from '@/ui';

export default function LibraryScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { width } = useWindowDimensions();
  // Two tiles per row, sharing the screen width minus the edge insets and one gap.
  const tile = Math.floor((width - spacing.screen * 2 - spacing.lg) / 2);
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

  // Hero = most recently practiced piece.
  const hero = useMemo(() => {
    const practiced = (songs ?? []).filter((s) => s.progress).sort((a, b) => b.progress!.updatedAt - a.progress!.updatedAt);
    return practiced[0] ?? null;
  }, [songs]);

  const header = (
    <View style={[styles.header, { paddingBottom: spacing.xxl }]}>
      <Text variant="title">Library</Text>
      {/* No "+" on an empty library: the screen itself is the import prompt. */}
      {songs && songs.length > 0 ? (
        <IconButton
          icon={<Icon name="plus" size={20} tone="onInk" />}
          variant="accent"
          size={42}
          accessibilityLabel="Add music"
          onPress={() => router.push('/add-music')}
        />
      ) : null}
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
          <SheetIllustration />
          <Text variant="heading" style={{ paddingTop: spacing.md }}>Bring your own sheet music</Text>
          <Text tone="muted">Any MusicXML file works. Export one from MuseScore, Sibelius or Finale, or find free scores on MuseScore and IMSLP.</Text>
          <Button
            label="Choose a file"
            variant="accent"
            block
            iconLeft={<Icon name="file" size={18} tone="onInk" />}
            onPress={onImport}
            disabled={busy}
            style={{ marginTop: spacing.sm }}
          />
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
      <View style={[styles.grid, { paddingHorizontal: spacing.screen, gap: spacing.lg }]}>
        {songs.map((item) => (
          <Pressable key={item.id} onPress={() => open(item)} onLongPress={() => onDelete(item)} style={({ pressed }) => [{ width: tile }, pressed && styles.pressed]}>
            <SongArt songId={item.id} width={tile} height={tile} radius={radius.lg} />
            <Text variant="bodyStrong" numberOfLines={1} style={{ paddingTop: spacing.sm }}>{item.title}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {composerSurname(item.composer)} · {item.progress ? `Bar ${item.progress.lastMeasure + 1} of ${item.totalMeasures}` : 'Not started'}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text tone="accent" style={{ paddingHorizontal: spacing.screen, color: colors.wrong }}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { alignItems: 'stretch' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  pressed: { opacity: 0.85 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
