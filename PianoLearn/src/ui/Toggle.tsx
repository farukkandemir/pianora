import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/** Plum switch. Same size as the iOS switch, styled to the theme. */
export function Toggle({ value, onChange, accessibilityLabel, disabled }: ToggleProps) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={[
        styles.track,
        { borderRadius: radius.pill, backgroundColor: value ? colors.accent : colors.inkFaint, alignItems: value ? 'flex-end' : 'flex-start' },
        disabled && styles.disabled,
      ]}
    >
      {/* White in both themes; it also sits on the faint off-track, where white still reads. */}
      <View style={[styles.knob, { borderRadius: radius.pill, backgroundColor: colors.onAccent }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20 },
  disabled: { opacity: 0.45 },
});
