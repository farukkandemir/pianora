/**
 * On-screen piano. Pure presentation: tells the user which keys to play and
 * what they're currently pressing. Keys are tappable so Wait Mode can be
 * exercised without a MIDI keyboard (simulator, demos).
 */
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface KeyboardRange {
  /** Inclusive MIDI numbers; both are snapped outward to C and B. */
  low: number;
  high: number;
}

interface Props {
  range: KeyboardRange;
  /** Keys the user must play now. */
  expected: number[];
  /** Expected keys already satisfied (chords in progress). */
  satisfied: number[];
  /** Wrong keys currently held. */
  wrong: number[];
  /** All keys currently held (from MIDI). */
  held: number[];
  onKeyDown?: (midi: number) => void;
  onKeyUp?: (midi: number) => void;
  height?: number;
}

const BLACK = new Set([1, 3, 6, 8, 10]);
const isBlack = (midi: number) => BLACK.has(midi % 12);
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function snapRange(range: KeyboardRange): KeyboardRange {
  const low = Math.floor(range.low / 12) * 12; // down to C
  const high = Math.ceil((range.high + 1) / 12) * 12 - 1; // up to B
  return { low: Math.max(21, low), high: Math.min(108, high) };
}

export const PianoKeyboard = memo(function PianoKeyboard({
  range, expected, satisfied, wrong, held, onKeyDown, onKeyUp, height = 110,
}: Props) {
  const { low, high } = snapRange(range);
  const whites = useMemo(() => {
    const out: number[] = [];
    for (let m = low; m <= high; m++) if (!isBlack(m)) out.push(m);
    return out;
  }, [low, high]);

  const expectedSet = new Set(expected);
  const satisfiedSet = new Set(satisfied);
  const wrongSet = new Set(wrong);
  const heldSet = new Set(held);

  const colorFor = (midi: number, black: boolean): string => {
    if (wrongSet.has(midi)) return '#e5484d';
    if (satisfiedSet.has(midi)) return '#30a46c';
    if (expectedSet.has(midi)) return '#3e8ef7';
    if (heldSet.has(midi)) return black ? '#666' : '#d8d8d8';
    return black ? '#222' : '#fff';
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.whiteRow}>
        {whites.map((midi) => (
          <Pressable
            key={midi}
            onPressIn={() => onKeyDown?.(midi)}
            onPressOut={() => onKeyUp?.(midi)}
            style={[styles.white, { backgroundColor: colorFor(midi, false) }]}
          >
            {midi % 12 === 0 && <Text style={styles.label}>C{midi / 12 - 1}</Text>}
          </Pressable>
        ))}
      </View>
      <View style={styles.blackLayer} pointerEvents="box-none">
        {whites.map((midi, i) => {
          const black = midi + 1;
          if (black > high || !isBlack(black)) return null;
          // Black key sits on the boundary between this white key and the next.
          const leftPct = ((i + 1) / whites.length) * 100;
          return (
            <Pressable
              key={black}
              onPressIn={() => onKeyDown?.(black)}
              onPressOut={() => onKeyUp?.(black)}
              style={[styles.black, { left: `${leftPct}%`, width: `${(100 / whites.length) * 0.6}%`, backgroundColor: colorFor(black, true) }]}
            />
          );
        })}
      </View>
    </View>
  );
});

export function noteLabel(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#333' },
  whiteRow: { flexDirection: 'row', height: '100%' },
  white: {
    flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: '#999',
    borderBottomLeftRadius: 3, borderBottomRightRadius: 3, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 3,
  },
  label: { fontSize: 9, color: '#888' },
  blackLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  black: { position: 'absolute', top: 0, height: '100%', transform: [{ translateX: '-50%' }], borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
});
