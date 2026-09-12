/**
 * Practice header, from the Paper "Practice V1" artboards.
 *
 * Left: back, piece title, "composer · Bar N of M". Right: hands as an
 * icon segmented control, then Loop and Restart as icon buttons with a
 * one-word caption. All practice controls live here; there is no bottom bar.
 *
 * Listen plays the piece through the piano sampler; the button shows the
 * download percentage the first time, then "Listen" / "Stop".
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HandMode } from '@/engine/model';
import type { ListenState } from '@/practice/useListen';
import { useTheme } from '@/theme';
import { Icon, Segmented, Text, type IconName } from '@/ui';

interface Props {
  /** Safe-area insets: the bar spans the full width, its content stays clear of the island. */
  insetLeft: number;
  insetRight: number;
  title: string;
  subtitle: string;
  onBack: () => void;
  handMode: HandMode;
  onHandMode: (m: HandMode) => void;
  /** Bar numbers of the current loop, e.g. "4–7"; null when off. Edges are adjusted on the score itself. */
  loopLabel: string | null;
  onToggleLoop: () => void;
  onRestart: () => void;
  listen: ListenState;
  onToggleListen: () => void;
}

export const TOP_BAR_HEIGHT = 60;

export function PracticeTopBar(p: Props) {
  const { spacing } = useTheme();

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
        label={p.loopLabel ?? 'Loop'}
        active={p.loopLabel !== null}
        onPress={p.onToggleLoop}
        accessibilityLabel={p.loopLabel ? 'Turn loop off' : 'Loop the current bars'}
      />
      <BarAction icon="rotate-ccw" label="Restart" onPress={p.onRestart} accessibilityLabel="Restart from the first bar" />
      <BarAction
        icon={p.listen.kind === 'playing' ? 'square' : 'headphones'}
        label={listenLabel(p.listen)}
        active={p.listen.kind !== 'idle' && p.listen.kind !== 'error'}
        onPress={p.onToggleListen}
        accessibilityLabel={p.listen.kind === 'playing' ? 'Stop listening' : 'Listen to the piece'}
      />
    </View>
  );
}

function listenLabel(s: ListenState): string {
  switch (s.kind) {
    case 'downloading': return `${Math.round(s.progress * 100)}%`;
    case 'loading': return 'Loading';
    case 'playing': return 'Stop';
    case 'error': return 'Retry';
    default: return 'Listen';
  }
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

/** Icon over a one-word caption; active = plum wash. */
function BarAction({ icon, label, active, onPress, accessibilityLabel }: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors, radius } = useTheme();
  const tone = active ? 'accent' : 'ink';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.action,
        { borderRadius: radius.md, backgroundColor: active ? colors.accentTint : 'transparent' },
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={18} tone={tone} />
      <Text variant="micro" tone={tone} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  piece: { flex: 1, minWidth: 0, paddingLeft: 4, paddingRight: 8 },
  bothHands: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  action: { width: 52, height: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pressed: { opacity: 0.7 },
});
