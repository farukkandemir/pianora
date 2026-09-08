/**
 * Control strip for the practice screen. Presentation only.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HandMode, MeasureRange } from '@/engine/model';

export interface LoopSelection {
  picking: boolean;
  start: number | null;
}

interface Props {
  handMode: HandMode;
  onHandMode: (m: HandMode) => void;
  loop: MeasureRange | null;
  loopSel: LoopSelection;
  onStartLoopPick: () => void;
  onClearLoop: () => void;
  onRestart: () => void;
  measureNumber: string;
  totalMeasures: number;
}

const HANDS: { key: HandMode; label: string }[] = [
  { key: 'left', label: 'Left' },
  { key: 'both', label: 'Both' },
  { key: 'right', label: 'Right' },
];

export function PracticeControls(p: Props) {
  const loopLabel = p.loopSel.picking
    ? p.loopSel.start === null ? 'Tap first measure…' : 'Tap last measure…'
    : p.loop ? `Loop ${p.loop.start + 1}–${p.loop.end + 1}` : 'Loop';

  return (
    <View style={styles.bar}>
      <View style={styles.group}>
        {HANDS.map((h) => (
          <Chip key={h.key} label={h.label} active={p.handMode === h.key} onPress={() => p.onHandMode(h.key)} />
        ))}
      </View>
      <Text style={styles.measure}>m. {p.measureNumber} / {p.totalMeasures}</Text>
      <View style={styles.group}>
        <Chip label={loopLabel} active={!!p.loop || p.loopSel.picking} onPress={p.onStartLoopPick} />
        {p.loop || p.loopSel.picking ? <Chip label="✕" onPress={p.onClearLoop} /> : null}
        <Chip label="Restart" onPress={p.onRestart} />
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f2f2f2', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  group: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#e2e2e2' },
  chipActive: { backgroundColor: '#2f80ed' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  chipTextActive: { color: '#fff' },
  measure: { fontSize: 13, color: '#555' },
});
