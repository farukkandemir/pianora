/**
 * The five hand colours as tappable dots. The selected one wears a ring;
 * the colour the other hand uses is faded and cannot be picked, so the two
 * hands never match.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { handPalette, useTheme, type HandColorKey } from '@/theme';

const KEYS = Object.keys(handPalette) as HandColorKey[];

export function HandSwatches({ value, taken, onChange }: {
  value: HandColorKey;
  /** The other hand's colour. */
  taken: HandColorKey;
  onChange: (key: HandColorKey) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {KEYS.map((key) => {
        const selected = key === value;
        const disabled = key === taken;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            disabled={disabled}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={key}
            style={[styles.slot, selected && { borderColor: handPalette[key] }]}
          >
            <View style={[styles.dot, { backgroundColor: handPalette[key] }, selected && { borderColor: colors.surface }, disabled && styles.taken]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  taken: { opacity: 0.3 },
});
