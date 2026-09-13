/**
 * Pick a first piece, from the Paper "Onboarding · first piece" artboard.
 * Second and last onboarding screen. Tapping a row adds the catalogue piece
 * and opens it in practice; the pinned button imports a file instead. Both
 * end onboarding. Skip ends it with an empty library.
 */
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATALOG, LEVEL_LABEL, type CatalogEntry, type CatalogLevel } from '@/catalog/catalog';
import { useAddFromCatalog } from '@/catalog/useAddFromCatalog';
import { SongArt } from '@/components/library/SongArt';
import { useImportSong } from '@/data/useImportSong';
import { useSettings } from '@/data/useSettings';
import { composerSurname } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, Chip, Icon, Text, useCurtain } from '@/ui';

const ART = 56;
const LEVELS: CatalogLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function FirstPieceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const curtain = useCurtain();
  const { colors, spacing, radius } = useTheme();
  const { set } = useSettings();
  const { add, busyId } = useAddFromCatalog();
  const { importFromPicker, busy: importing } = useImportSong();
  const [level, setLevel] = useState<CatalogLevel>('beginner');

  const entries = CATALOG.filter((e) => e.level === level);

  // Ending onboarding flips the route guard: the onboarding screens leave the
  // history and the tab shell becomes the base. Practice is pushed on top of
  // it, so Back from practice lands on the Library, same as any other open.
  const finish = useCallback(async (songId: string | null) => {
    set('onboarded', true);
    if (!songId) return;
    await curtain.raise();
    router.replace('/');
    router.push({ pathname: '/song/[id]', params: { id: songId } });
  }, [set, curtain, router]);

  const onPick = useCallback(async (entry: CatalogEntry) => {
    const song = await add(entry);
    if (song) await finish(song.id);
  }, [add, finish]);

  const onImport = useCallback(async () => {
    const song = await importFromPicker();
    if (song) await finish(song.id);
  }, [importFromPicker, finish]);

  const disabled = busyId !== null || importing;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.screen }]}>
        <Text variant="title">Pick a first piece</Text>
        <Pressable onPress={() => finish(null)} hitSlop={12} accessibilityRole="button" disabled={disabled}>
          <Text variant="bodyStrong" tone="muted">Skip</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: spacing.lg }}>
        <Text tone="muted">Something you already know by ear works best. You can add more from Browse any time.</Text>
        <View style={[styles.chips, { gap: spacing.sm }]}>
          {LEVELS.map((l) => (
            <Chip key={l} label={LEVEL_LABEL[l]} selected={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xs }}>
        {entries.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => onPick(entry)}
            disabled={disabled}
            accessibilityLabel={`${entry.title}, ${entry.composer}`}
            accessibilityHint="Adds the piece and opens it in practice"
            style={({ pressed }) => [styles.row, { gap: spacing.lg, paddingVertical: spacing.sm }, pressed && styles.pressed]}
          >
            <SongArt songId={entry.id} width={ART} height={ART} radius={radius.md} />
            <View style={styles.rowText}>
              <Text variant="bodyLarge" numberOfLines={1}>{entry.title}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {composerSurname(entry.composer)} · {entry.bars} bars · {LEVEL_LABEL[entry.level]}
              </Text>
            </View>
            {busyId === entry.id ? <ActivityIndicator color={colors.accentInk} /> : <Icon name="chevron-right" size={18} tone="faint" />}
          </Pressable>
        ))}
      </ScrollView>

      {/* Pinned over the list, on the page colour, so it never scrolls away. */}
      <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm, alignItems: 'center', backgroundColor: colors.bg }}>
        <Button
          label="I have my own sheet music"
          variant="tint"
          block
          iconLeft={<Icon name="file" size={18} tone="accent" />}
          onPress={onImport}
          disabled={disabled}
        />
        <Text variant="caption" tone="faint">.musicxml · .xml · .mxl</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chips: { flexDirection: 'row' },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, gap: 3 },
  pressed: { opacity: 0.85 },
});
