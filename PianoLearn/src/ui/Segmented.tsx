import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ReactNode };

export type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Pill segmented control. The selected segment is a raised white pill on a
 * muted track, like the Hands control in the practice panel.
 */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.track, { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, { borderRadius: radius.pill }, selected && { backgroundColor: colors.surface, ...styles.raised }]}
          >
            {o.icon}
            <Text variant="caption" tone={selected ? 'ink' : 'muted'} style={[styles.label, selected && styles.labelSelected]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, gap: 2 },
  segment: { flex: 1, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  raised: { shadowColor: '#1E2433', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  label: { fontSize: 13, lineHeight: 16 },
  labelSelected: { fontWeight: '600' },
});
