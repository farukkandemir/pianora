import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContinueCard } from '@/components/library/ContinueCard';
import { SheetIllustration } from '@/components/library/SheetIllustration';
import { SongTile } from '@/components/library/SongTile';
import { deleteSong, isStarted, renameSong, type SongListItem } from '@/data/songs';
import { useImportSong } from '@/data/useImportSong';
import { useSongs } from '@/data/useSongs';
import { useTheme } from '@/theme';
import { Button, Chip, Icon, IconButton, Screen, SearchField, Text, useCurtain } from '@/ui';

type Filter = 'recent' | 'inProgress' | 'az';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'az', label: 'A–Z' },
];

/** Case- and accent-insensitive "contains" for titles and composers. */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function LibraryScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  // Two tiles per row, sharing the screen width minus the edge insets and one gap.
  const tile = Math.floor((width - spacing.screen * 2 - spacing.lg) / 2);
  const { songs, error, refresh } = useSongs();
  const curtain = useCurtain();
  const { importFromPicker, busy } = useImportSong();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('recent');

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

  // iOS text prompt; the title is the only thing a user can edit on a piece.
  const onRename = useCallback((song: SongListItem) => {
    Alert.prompt('Rename piece', undefined, async (title) => {
      if (title === undefined || title.trim() === song.title) return;
      try {
        await renameSong(song.id, title);
        refresh();
      } catch (e) {
        Alert.alert('Could not rename', e instanceof Error ? e.message : String(e));
      }
    }, 'plain-text', song.title);
  }, [refresh]);

  // Hero = most recently practiced piece.
  const hero = useMemo(() => {
    const practiced = (songs ?? []).filter(isStarted).sort((a, b) => b.progress!.updatedAt - a.progress!.updatedAt);
    return practiced[0] ?? null;
  }, [songs]);

  // The list comes from the DB in "recent" order; the chips and the search
  // box narrow and reorder it here, on the client.
  const searching = query.trim().length > 0;
  const visible = useMemo(() => {
    let list = songs ?? [];
    if (searching) {
      const q = normalize(query.trim());
      list = list.filter((s) => normalize(s.title).includes(q) || normalize(s.composer ?? '').includes(q));
    }
    if (filter === 'inProgress') list = list.filter(isStarted);
    if (filter === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [songs, query, searching, filter]);

  const header = (
    <View style={[styles.header, { paddingBottom: spacing.xxl }]}>
      <Text variant="title">Library</Text>
      {/* No "+" on an empty library: the screen itself is the import prompt. */}
      {songs && songs.length > 0 ? (
        <IconButton
          icon={<Icon name="plus" size={20} tone="onAccent" />}
          variant="accent"
          size={42}
          accessibilityLabel="Add music"
          onPress={() => router.push('/add-music')}
        />
      ) : null}
    </View>
  );

  if (songs === null) {
    return <Screen tabBar>{header}</Screen>;
  }

  if (songs.length === 0) {
    return (
      <Screen tabBar>
        {header}
        <View style={[styles.empty, { gap: spacing.md, paddingTop: spacing.xxxl }]}>
          <SheetIllustration />
          <Text variant="heading" style={{ paddingTop: spacing.md }}>Bring your own sheet music</Text>
          <Text tone="muted">Any MusicXML file works. Export one from MuseScore, Sibelius or Finale, or find free scores on MuseScore and IMSLP.</Text>
          <Button
            label="Choose a file"
            variant="accent"
            block
            iconLeft={<Icon name="file" size={18} tone="onAccent" />}
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
    <Screen inset={false} tabBar>
      <View style={{ paddingHorizontal: spacing.screen }}>
        {header}
        <SearchField value={query} onChangeText={setQuery} placeholder="Search your pieces or composers" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.md }}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.sm }}
      >
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>

      {/* The hero belongs to browsing, not to a search result. */}
      {hero && !searching ? (
        <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.xl }}>
          <ContinueCard song={hero} onPress={() => open(hero)} />
        </View>
      ) : null}

      <View style={[styles.sectionHead, { paddingHorizontal: spacing.screen, paddingTop: spacing.xxl, paddingBottom: spacing.md }]}>
        <Text variant="section">{searching ? 'Results' : 'Your pieces'}</Text>
        <Text variant="caption" tone="muted">{visible.length} {visible.length === 1 ? 'piece' : 'pieces'}</Text>
      </View>
      {visible.length === 0 ? (
        <Text tone="muted" style={{ paddingHorizontal: spacing.screen }}>
          {searching ? `Nothing matches “${query.trim()}”.` : 'Nothing in progress yet. Play past the first bar of a piece and it shows up here.'}
        </Text>
      ) : null}
      <View style={[styles.grid, { paddingHorizontal: spacing.screen, gap: spacing.lg }]}>
        {visible.map((item) => (
          <SongTile
            key={item.id}
            song={item}
            width={tile}
            onOpen={() => open(item)}
            onRename={() => onRename(item)}
            onDelete={() => onDelete(item)}
          />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
