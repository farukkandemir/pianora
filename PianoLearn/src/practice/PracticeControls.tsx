/**
 * Control strip for the practice screen. Presentation only.
 * Replaces the system header: back button + title live here to save height.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HandMode, MeasureRange } from '@/engine/model';

export interface LoopSelection {
  picking: boolean;
  start: number | null;
}

interface Props {
  title: string;
  onBack: () => void;
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
  { key: 'left', label: 'L' },
  { key: 'both', label: 'Both' },
  { key: 'right', label: 'R' },
];

export function PracticeControls(p: Props) {
  const loopLabel = p.loopSel.picking
    ? p.loopSel.start === null ? 'Tap first…' : 'Tap last…'
    : p.loop ? `Loop ${p.loop.start + 1}–${p.loop.end + 1}` : 'Loop';

  return (
    <View style={styles.bar}>
      <Pressable onPress={p.onBack} hitSlop={8} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{p.title}</Text>

      <View style={styles.group}>
        {HANDS.map((h) => (
          <Chip key={h.key} label={h.label} active={p.handMode === h.key} onPress={() => p.onHandMode(h.key)} />
        ))}
      </View>
      <Text style={styles.measure}>m. {p.measureNumber}/{p.totalMeasures}{p.pass && p.pass > 1 ? ` ·${p.pass}×` : ''}</Text>
      <View style={styles.group}>
        <Chip label={loopLabel} active={!!p.loop || p.loopSel.picking} onPress={p.onStartLoopPick} />
        {p.loop || p.loopSel.picking ? <Chip label="✕" onPress={p.onClearLoop} /> : null}
        <Chip label="↺" onPress={p.onRestart} />
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

const BAR_HEIGHT = 36;

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8,
    backgroundColor: '#f2f2f2', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc',
  },
  back: { paddingHorizontal: 4 },
  backText: { fontSize: 26, lineHeight: 28, color: '#2f80ed', marginTop: -3 },
  title: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  group: { flexDirection: 'row', gap: 4 },
  chip: { paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: '#e2e2e2', justifyContent: 'center' },
  chipActive: { backgroundColor: '#2f80ed' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#333' },
  chipTextActive: { color: '#fff' },
  measure: { fontSize: 12, color: '#555', fontVariant: ['tabular-nums'] },
});
