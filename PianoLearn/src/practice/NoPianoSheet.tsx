/**
 * One-time sheet on the practice screen when no MIDI piano is connected.
 * From the Paper "Practice · first run · no piano sheet" artboard. Not a
 * route: an iPhone in landscape turns a native form sheet almost full
 * height, and the score has to stay visible above this one.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Button, Icon, Text } from '@/ui';

const SHEET_HEIGHT = 206;

type Props = {
  visible: boolean;
  onPair: () => void;
  onDismiss: () => void;
};

export function NoPianoSheet({ visible, onPair, onDismiss }: Props) {
  const { colors, radius, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 320,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished && !visible) setMounted(false); });
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT + insets.bottom, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.curtain, opacity: Animated.multiply(progress, 0.28) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessible={false} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          shadows.card,
          {
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: insets.bottom + 30,
            paddingHorizontal: 56,
            gap: 18,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text variant="heading" center>Pair your piano</Text>
          <Text tone="muted" center style={{ maxWidth: 560 }}>
            Turn on Bluetooth on the piano, then pick it from the list. USB works too, plug in and it connects on its own.
          </Text>
        </View>
        <View style={[styles.actions, { gap: 22, paddingTop: spacing.md }]}>
          <Button
            label="Pair a Bluetooth piano"
            variant="accent"
            iconLeft={<Icon name="bluetooth" size={16} tone="onAccent" />}
            onPress={onPair}
          />
          <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button">
            <Text variant="bodyStrong" tone="muted">Play on screen for now</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 10 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
