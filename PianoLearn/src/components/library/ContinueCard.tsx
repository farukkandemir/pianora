import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { SongListItem } from '@/data/songs';
import { displayComposer } from '@/lib/format';
import { useTheme } from '@/theme';
import { Icon, Text } from '@/ui';
import { SongArt } from './SongArt';

/**
 * The hero on the Library: the piece you were last practicing. Artwork with
 * an ink scrim fading in over the bottom, title and composer in white on it,
 * plum Resume pill. No badge: the card's position says "continue". The scrim is a 1x64 PNG (ink, 5% -> 78% alpha from 30%
 * down) stretched over the card: no gradient library, no experimental API.
 * Regenerate the asset if the ink color or the fade changes.
 */
const SCRIM = require('../../../assets/images/scrim-ink.png');
export function ContinueCard({ song, onPress }: { song: SongListItem; onPress: () => void }) {
  const { colors, radius, spacing, shadows } = useTheme();
  const bar = (song.progress?.lastMeasure ?? 0) + 1;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ borderRadius: radius.xl }, shadows.card, pressed && styles.pressed]}>
      <View style={[styles.card, { borderRadius: radius.xl, backgroundColor: colors.surfaceMuted }]}>
        <SongArt songId={song.id} height={CARD_HEIGHT} radius={radius.xl} style={StyleSheet.absoluteFill} />
        <Image source={SCRIM} resizeMode="stretch" style={styles.scrim} accessibilityIgnoresInvertColors />
        <View style={[styles.bottom, { padding: 18, gap: spacing.md }]}>
          <View style={styles.titles}>
            <Text variant="heading" tone="onAccent" numberOfLines={1} style={styles.title}>{song.title}</Text>
            <Text variant="caption" tone="onAccent" numberOfLines={1} style={styles.subtitle}>
              {displayComposer(song.composer)} · Bar {bar} of {song.totalMeasures}
            </Text>
          </View>
          <View style={[styles.resume, { backgroundColor: colors.accent, borderRadius: radius.pill, gap: spacing.sm }]}>
            <Icon name="play" size={14} tone="onAccent" />
            <Text variant="bodyStrong" tone="onAccent">Resume</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const CARD_HEIGHT = 200;

const styles = StyleSheet.create({
  card: { height: CARD_HEIGHT, overflow: 'hidden' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  titles: { flex: 1, gap: 4 },
  title: { lineHeight: 26 },
  subtitle: { lineHeight: 16, opacity: 0.8 },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  resume: { height: 40, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 16 },
});
