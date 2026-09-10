import { Pressable, StyleSheet, View } from 'react-native';

import type { SongListItem } from '@/data/songs';
import { displayComposer } from '@/lib/format';
import { useTheme } from '@/theme';
import { Icon, Text } from '@/ui';
import { SongArt } from './SongArt';

/** The hero on the Library: the piece you were last practicing. */
export function ContinueCard({ song, onPress }: { song: SongListItem; onPress: () => void }) {
  const { colors, radius, spacing, shadows } = useTheme();
  const bar = (song.progress?.lastMeasure ?? 0) + 1;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ borderRadius: radius.xl }, shadows.card, pressed && styles.pressed]}>
      <View style={[styles.card, { borderRadius: radius.xl }]}>
        <SongArt songId={song.id} height={200} radius={radius.xl} style={StyleSheet.absoluteFill} />
        <View style={[styles.badge, { left: spacing.lg, top: spacing.lg, backgroundColor: colors.accentTint, borderRadius: radius.pill }]}>
          <Text variant="label" tone="accent" style={styles.badgeText}>Continue</Text>
        </View>
        <View style={[styles.bottom, { padding: spacing.lg, gap: spacing.md }]}>
          <View style={[styles.textPanel, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }]}>
            <Text variant="subheading" numberOfLines={1}>{song.title}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {displayComposer(song.composer)} · Bar {bar} of {song.totalMeasures}
            </Text>
          </View>
          <View style={[styles.resume, { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
            <Icon name="play" size={14} tone="onInk" />
            <Text variant="bodyStrong" tone="onInk">Resume</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { height: 200, overflow: 'hidden' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  badge: { position: 'absolute', height: 26, paddingHorizontal: 10, justifyContent: 'center' },
  badgeText: { fontSize: 11, lineHeight: 14 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  textPanel: { flex: 1 },
  resume: { height: 40, flexDirection: 'row', alignItems: 'center' },
});
