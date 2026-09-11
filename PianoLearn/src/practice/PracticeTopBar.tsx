/**
 * Practice header, from the Paper "Practice V1" artboards.
 *
 * Left: back, piece title, "composer · Bar N of M". Right: hands as an icon
 * segmented control, then Loop and Restart as icon buttons with a one-word
 * caption. The Wait Mode button from the artboard is not here yet: the
 * engine has no play-along mode for it to switch to.
 */
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HandMode, MeasureRange } from '@/engine/model';
import { useTheme } from '@/theme';
import { Icon, Segmented, Text, type IconName } from '@/ui';

export interface LoopSelection {
  picking: boolean;
  /** First bar tapped while picking; null until the user taps one. */
  start: number | null;
}

interface Props {
  /** Safe-area insets: the bar spans the full width, its content stays clear of the island. */
  insetLeft: number;
  insetRight: number;
  title: string;
  subtitle: string;
  onBack: () => void;
  handMode: HandMode;
  onHandMode: (m: HandMode) => void;
  loop: MeasureRange | null;
  loopSel: LoopSelection;
  /** Idle or set: start picking bars. Picking: cancel. */
  onLoopPress: () => void;
  onClearLoop: () => void;
  onRestart: () => void;
}

export const TOP_BAR_HEIGHT = 60;

export function PracticeTopBar(p: Props) {
  const { colors, spacing } = useTheme();

  // Loop button: idle "Loop" → picking "Tap 1st" / "Tap last" → set "2–3" with a clear badge.
  const loopTone: ActionTone = p.loopSel.picking ? 'solid' : p.loop ? 'tint' : 'idle';
  const loopLabel = p.loopSel.picking
    ? p.loopSel.start === null ? 'Tap 1st' : 'Tap last'
    : p.loop ? `${p.loop.start + 1}–${p.loop.end + 1}` : 'Loop';

  return (
    <View style={[styles.bar, { paddingLeft: 16 + p.insetLeft, paddingRight: 12 + p.insetRight, gap: spacing.sm }]}>
      <Pressable onPress={p.onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to Library">
        <Icon name="chevron-left" size={24} />
      </Pressable>

      <View style={styles.piece}>
        <Text variant="subheading" numberOfLines={1}>{p.title}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>{p.subtitle}</Text>
      </View>

      <Segmented<HandMode>
        fit
        value={p.handMode}
        onChange={p.onHandMode}
        options={[
          { value: 'left', accessibilityLabel: 'Left hand only', icon: <Hand side="left" size={20} /> },
          { value: 'both', accessibilityLabel: 'Both hands', icon: <BothHands /> },
          { value: 'right', accessibilityLabel: 'Right hand only', icon: <Hand side="right" size={20} /> },
        ]}
      />

      <BarAction
        icon="repeat"
        label={loopLabel}
        tone={loopTone}
        onPress={p.onLoopPress}
        accessibilityLabel={p.loopSel.picking ? 'Cancel choosing loop bars' : p.loop ? 'Choose different loop bars' : 'Loop bars'}
        badge={p.loop && !p.loopSel.picking ? (
          <Pressable
            onPress={p.onClearLoop}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear loop"
            style={[styles.badge, { backgroundColor: colors.ink, borderColor: colors.bg }]}
          >
            <Icon name="x" size={10} tone="onInk" />
          </Pressable>
        ) : null}
      />
      <BarAction icon="rotate-ccw" label="Restart" onPress={p.onRestart} accessibilityLabel="Restart from the first bar" />
    </View>
  );
}

/** Outline hand glyph in the hand's colour, the same colour the keyboard uses. */
function Hand({ side, size }: { side: 'left' | 'right'; size: number }) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={side === 'left' ? 'hand-left-outline' : 'hand-right-outline'}
      size={size}
      color={side === 'left' ? colors.leftHand : colors.rightHand}
    />
  );
}

function BothHands() {
  return (
    <View style={styles.bothHands}>
      <Hand side="left" size={17} />
      <Hand side="right" size={17} />
    </View>
  );
}

type ActionTone = 'idle' | 'tint' | 'solid';

/** Icon over a one-word caption. idle = plain, tint = plum wash, solid = plum fill. */
function BarAction({ icon, label, tone = 'idle', onPress, accessibilityLabel, badge }: {
  icon: IconName;
  label: string;
  tone?: ActionTone;
  onPress: () => void;
  accessibilityLabel: string;
  badge?: ReactNode;
}) {
  const { colors, radius } = useTheme();
  const bg = { idle: 'transparent', tint: colors.accentTint, solid: colors.accent }[tone];
  const textTone = { idle: 'ink', tint: 'accent', solid: 'onInk' } as const;
  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.action, { borderRadius: radius.md, backgroundColor: bg }, pressed && styles.pressed]}
      >
        <Icon name={icon} size={18} tone={textTone[tone]} />
        <Text variant="micro" tone={textTone[tone]} numberOfLines={1}>{label}</Text>
      </Pressable>
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  piece: { flex: 1, minWidth: 0, paddingLeft: 4, paddingRight: 8 },
  bothHands: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  action: { width: 52, height: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
