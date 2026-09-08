/**
 * Bottom control bar for the practice screen. Presentation only.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HandMode, MeasureRange } from '@/engine/model';

export interface LoopSelection {
  picking: boolean;
  start: number | null;
}

interface Props {
  insetLeft: number;
  insetRight: number;
  handMode: HandMode;
  onHandMode: (m: HandMode) => void;
  loop: MeasureRange | null;
  loopSel: LoopSelection;
  onStartLoopPick: () => void;
  onClearLoop: () => void;
  onRestart: () => void;
  measureNumber: string;
  totalMeasures: number;
  /** 2 when playing a repeated section the second time, etc. */
  pass?: number;
}

const HANDS: { key: HandMode; label: string }[] = [
  { key: 'left', label: 'Left' },
  { key: 'both', label: 'Both' },
  { key: 'right', label: 'Right' },
];

export const BOTTOM_BAR_HEIGHT = 40;

export function PracticeControls(p: Props) {
  const loopLabel = p.loopSel.picking
    ? p.loopSel.start === null ? 'Tap first measure' : 'Tap last measure'
    : p.loop ? `Loop ${p.loop.start + 1}–${p.loop.end + 1}` : 'Loop';

  return (
    <View style={[styles.bar, { paddingLeft: 8 + p.insetLeft, paddingRight: 8 + p.insetRight }]}>
      <View style={styles.segment}>
        {HANDS.map((h) => (
          <Pressable key={h.key} onPress={() => p.onHandMode(h.key)} style={[styles.segItem, p.handMode === h.key && styles.segItemActive]}>
            <Text style={[styles.segText, p.handMode === h.key && styles.segTextActive]}>{h.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.measure}>
        m. {p.measureNumber}/{p.totalMeasures}{p.pass && p.pass > 1 ? `  ·${p.pass}×` : ''}
      </Text>

      <View style={styles.group}>
        <Chip label={loopLabel} active={!!p.loop || p.loopSel.picking} onPress={p.onStartLoopPick} />
        {p.loop || p.loopSel.picking ? <Chip label="✕" onPress={p.onClearLoop} /> : null}
        <Chip label="↺ Restart" onPress={p.onRestart} />
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BOTTOM_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f7f7f7', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd',
  },
  segment: { flexDirection: 'row', backgroundColor: '#e4e4e4', borderRadius: 8, padding: 2 },
  segItem: { paddingHorizontal: 12, height: 26, borderRadius: 6, justifyContent: 'center' },
  segItemActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  segText: { fontSize: 13, fontWeight: '600', color: '#555' },
  segTextActive: { color: '#111' },
  measure: { fontSize: 13, color: '#444', fontVariant: ['tabular-nums'] },
  group: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: '#e4e4e4', justifyContent: 'center' },
  chipActive: { backgroundColor: '#2f80ed' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  chipTextActive: { color: '#fff' },
});
