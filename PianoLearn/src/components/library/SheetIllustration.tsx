/**
 * The "Add music" hero from the Paper artboard: a tilted white sheet with two
 * staves and a few notes on a plum-tinted panel, and a plum "+" badge.
 * Drawn with plain Views so it needs no image or SVG dependency.
 */
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Icon } from '@/ui';

/** Notes as [x, y, stemUp]; y is the notehead centre inside a 54pt staff box. */
const TREBLE: [number, number, boolean][] = [[16, 28, true], [42, 20, true], [90, 24, true], [114, 32, true], [160, 16, true], [186, 24, true]];
const BASS: [number, number, boolean][] = [[20, 28, false], [96, 20, false], [170, 28, false]];

export function SheetIllustration() {
  const { colors, radius, shadows } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.accentTint, borderRadius: radius.xl }]}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }, shadows.card]}>
        <View style={styles.titleRow}>
          <View style={[styles.titleBar, { backgroundColor: colors.ink }]} />
          <View style={[styles.subtitleBar, { backgroundColor: colors.border }]} />
        </View>
        <Staff notes={TREBLE} top={8} accentIndex={1} />
        <Staff notes={BASS} top={4} />
      </View>
      <View style={[styles.badge, { backgroundColor: colors.accent }, shadows.accent]}>
        <Icon name="plus" size={20} tone="onInk" />
      </View>
    </View>
  );
}

function Staff({ notes, top, accentIndex }: { notes: [number, number, boolean][]; top: number; accentIndex?: number }) {
  const { colors } = useTheme();
  const line = { backgroundColor: colors.ink, opacity: 0.35 };
  return (
    <View style={styles.staff}>
      {[0, 1, 2, 3, 4].map((i) => <View key={i} style={[styles.line, line, { top: top + i * 8 }]} />)}
      {[70, 140].map((x) => <View key={x} style={[styles.barline, line, { left: x, top, height: 32 }]} />)}
      {notes.map(([x, y, up], i) => {
        const color = i === accentIndex ? colors.accent : colors.ink;
        return (
          <View key={i}>
            <View style={[styles.head, { left: x - 5, top: y - 3.5, backgroundColor: color }]} />
            <View style={[styles.stem, { left: up ? x + 4 : x - 5, top: up ? y - 21 : y, backgroundColor: color }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { height: 250, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sheet: { width: 250, borderRadius: 16, paddingVertical: 22, paddingHorizontal: 20, gap: 14, transform: [{ rotate: '-3deg' }] },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBar: { width: 90, height: 8, borderRadius: 4 },
  subtitleBar: { width: 40, height: 6, borderRadius: 3 },
  staff: { width: 210, height: 54 },
  line: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  barline: { position: 'absolute', width: StyleSheet.hairlineWidth },
  head: { position: 'absolute', width: 10, height: 7, borderRadius: 5, transform: [{ rotate: '-20deg' }] },
  stem: { position: 'absolute', width: 1.4, height: 21 },
  badge: { position: 'absolute', right: 34, bottom: 30, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
