/**
 * Thin top bar for the practice screen: back, title, what to play, MIDI state.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  /** Safe-area insets: the bar spans the full width, its content stays clear of the island. */
  insetLeft: number;
  insetRight: number;
  title: string;
  onBack: () => void;
  status: string;
  statusTone: 'normal' | 'wrong' | 'done';
  midiName: string | null;
}

export const TOP_BAR_HEIGHT = 34;

export function PracticeTopBar({ insetLeft, insetRight, title, onBack, status, statusTone, midiName }: Props) {
  return (
    <View style={[styles.bar, { paddingLeft: 8 + insetLeft, paddingRight: 8 + insetRight }]}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <Text
        style={[styles.status, statusTone === 'wrong' && styles.statusWrong, statusTone === 'done' && styles.statusDone]}
        numberOfLines={1}
      >
        {status}
      </Text>

      <View style={styles.midi}>
        <View style={[styles.dot, { backgroundColor: midiName ? '#30a46c' : '#e5484d' }]} />
        <Text style={styles.midiText} numberOfLines={1}>{midiName ?? 'No keyboard'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f7f7f7', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd',
  },
  back: { paddingHorizontal: 4 },
  backText: { fontSize: 28, lineHeight: 30, color: '#2f80ed', marginTop: -4 },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: '#222' },
  status: { flex: 1.2, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#2f80ed' },
  statusWrong: { color: '#e5484d' },
  statusDone: { color: '#30a46c' },
  midi: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  midiText: { fontSize: 12, color: '#666', flexShrink: 1 },
});
