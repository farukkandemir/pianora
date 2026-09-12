import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';
import { Icon } from './Icon';

export type SearchFieldProps = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * Search input on a muted surface: magnifier on the left, a clear button once
 * there is text. Web analogy: `<input type="search">` with the app's styling.
 */
export function SearchField({ value, onChangeText, placeholder = 'Search', ...rest }: SearchFieldProps) {
  const { colors, radius, spacing, type, fonts } = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md + 2, paddingHorizontal: spacing.md + 2, gap: spacing.sm + 2 }]}>
      <Icon name="search" size={18} tone="muted" />
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        returnKeyType="search"
        style={[styles.input, { color: colors.ink, fontSize: type.body.fontSize, ...(fonts.regular ? { fontFamily: fonts.regular } : null) }]}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search" style={styles.clear}>
          <Icon name="x" size={16} tone="muted" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: 44, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, height: '100%', paddingVertical: 0 },
  clear: { padding: 2 },
});
