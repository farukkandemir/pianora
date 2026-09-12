/**
 * Browse tab, from the Paper "Browse" artboard: the built-in catalogue of
 * public-domain pieces. The Add pill only saves the piece to the library (the
 * user stays here and can keep adding); tapping the row itself opens the piece
 * in practice, adding it first if needed.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CATALOG, LEVEL_LABEL, type CatalogEntry, type CatalogLevel } from '@/catalog/catalog';
import { useAddFromCatalog } from '@/catalog/useAddFromCatalog';
import { SongArt } from '@/components/library/SongArt';
import { useSongs } from '@/data/useSongs';
import { composerSurname } from '@/lib/format';
import { useTheme } from '@/theme';
import { Chip, Icon, Screen, Text, useCurtain } from '@/ui';

const ART = 72;

type Filter = 'all' | CatalogLevel;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

export default function BrowseTab() {
  const router = useRouter();
  const curtain = useCurtain();
  const { colors, spacing, radius } = useTheme();
  const { songs, refresh } = useSongs();
  const { add, busyId } = useAddFromCatalog();
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Catalogue id -> library song id, for the "Added" state and for opening directly.
  const added = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of songs ?? []) if (s.catalogId) map.set(s.catalogId, s.id);
    return map;
  }, [songs]);

  const entries = filter === 'all' ? CATALOG : CATALOG.filter((e) => e.level === filter);

  const openSong = useCallback(async (id: string) => {
    await curtain.raise();
    router.push({ pathname: '/song/[id]', params: { id } });
  }, [curtain, router]);

  // Pill: save only. Row: play now (adding first when needed).
  const onAdd = useCallback(async (entry: CatalogEntry) => {
    if (await add(entry)) await refresh();
  }, [add, refresh]);

  const onOpen = useCallback(async (entry: CatalogEntry) => {
    const existing = added.get(entry.id);
    if (existing) return openSong(existing);
    const song = await add(entry);
    if (song) {
      await refresh();
      await openSong(song.id);
    }
  }, [added, add, refresh, openSong]);

  return (
    <Screen>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
        <Text variant="title">Browse</Text>
        <Text tone="muted">Classics in the public domain, ready to practise. Tap one to add it to your library.</Text>
        {/* One row that scrolls sideways on narrow phones; bleeds to the screen edges. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.screen }}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.sm }}
        >
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: spacing.xs }}>
        {entries.map((entry) => {
          const isAdded = added.has(entry.id);
          const busy = busyId === entry.id;
          return (
            <Pressable
              key={entry.id}
              onPress={() => onOpen(entry)}
              disabled={busyId !== null}
              accessibilityLabel={`${entry.title}, ${entry.composer}${isAdded ? ', in your library' : ''}`}
              accessibilityHint="Opens the piece in practice"
              style={({ pressed }) => [styles.row, { gap: spacing.lg, paddingVertical: spacing.md }, pressed && styles.pressed]}
            >
              <SongArt songId={entry.id} width={ART} height={ART} radius={radius.md} />
              <View style={styles.rowText}>
                <Text variant="bodyLarge" numberOfLines={1}>{entry.title}</Text>
                <Text variant="body" tone="muted" numberOfLines={1} style={styles.sub}>
                  {composerSurname(entry.composer)} · {entry.bars} bars
                </Text>
                <Text variant="body" tone="faint" numberOfLines={1} style={styles.sub}>{LEVEL_LABEL[entry.level]}</Text>
              </View>
              <View style={styles.action}>
                {busy ? (
                  <ActivityIndicator color={colors.accentInk} />
                ) : isAdded ? (
                  <View style={[styles.added, { gap: spacing.xs }]}>
                    <Icon name="check" size={16} color="correct" />
                    <Text variant="body" tone="faint">Added</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => onAdd(entry)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${entry.title} to your library`}
                    style={({ pressed }) => [
                      styles.pill,
                      { backgroundColor: colors.accentTint, borderRadius: radius.pill, paddingHorizontal: spacing.lg },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text variant="bodyStrong" tone="accent">Add</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1 },
  sub: { fontSize: 14, lineHeight: 20 },
  action: { width: 76, alignItems: 'flex-end', justifyContent: 'center' },
  added: { flexDirection: 'row', alignItems: 'center' },
  pill: { height: 36, justifyContent: 'center' },
  pressed: { opacity: 0.85 },
});
