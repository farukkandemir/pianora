/**
 * Settings screen building blocks, from the Paper "Settings v2" artboard: a
 * small uppercase section title over a white card of rows separated by
 * hairlines. A row is a title, an optional subtitle, and something on the
 * right (a Toggle, a chevron, a value, swatches).
 */
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Card, Text } from '@/ui';

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const { colors, spacing } = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted" style={styles.groupTitle}>{title}</Text>
      <Card padding={0} style={{ paddingHorizontal: spacing.lg }}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            {row}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

export function SettingsRow({ title, subtitle, subtitleTone = 'muted', right, onPress }: {
  title: string;
  subtitle?: string;
  subtitleTone?: 'muted' | 'accent';
  right?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="bodyLarge" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text variant="body" tone={subtitleTone} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupTitle: { paddingLeft: 4, fontSize: 14, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth },
  row: { minHeight: 60, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  text: { flex: 1, gap: 1 },
  pressed: { opacity: 0.6 },
});
