import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { displayComposer } from '@/lib/format';
import { useTheme } from '@/theme';
import { Text } from '@/ui';

type Props = {
  /** Driven by the practice screen: 1 while covering, animated to 0 once the sheet is rendered. */
  opacity: Animated.Value;
  title?: string;
  composer?: string | null;
  /** 1-based bar the session resumes from, once known. */
  resumeBar?: number | null;
  totalMeasures?: number;
  error: string | null;
  onBack: () => void;
};

/**
 * Dark title card shown while a piece loads. It is the same colour as the
 * Library's curtain, so "tap a piece" reads as one continuous moment: the
 * screen goes dark, names the piece, and practice fades in finished.
 * The details only appear if loading takes more than a beat; a short load
 * fades straight through dark with nothing to read.
 */
export function PracticeTitleCard({ opacity, title, composer, resumeBar, totalMeasures, error, onBack }: Props) {
  const { colors, spacing } = useTheme();

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 300);
    return () => clearTimeout(t);
  }, []);

  const details = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (slow || error) Animated.timing(details, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [slow, error, details]);

  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const subtitle = [displayComposer(composer), resumeBar && totalMeasures ? `Bar ${resumeBar} of ${totalMeasures}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.card, { backgroundColor: colors.curtain, opacity }]}>
      <Animated.View style={[styles.details, { opacity: details, gap: spacing.sm }]}>
        {title ? <Text variant="heading" tone="onCurtain" center numberOfLines={2}>{title}</Text> : null}
        {title ? <Text tone="onCurtain" center style={styles.muted}>{subtitle}</Text> : null}
        {error ? (
          <>
            <Text tone="onCurtain" center style={[styles.muted, { paddingTop: spacing.md }]}>{error}</Text>
            <Pressable onPress={onBack} hitSlop={12} style={{ paddingTop: spacing.md }}>
              <Text variant="bodyStrong" tone="onCurtain" center>Back to Library</Text>
            </Pressable>
          </>
        ) : (
          <Animated.View style={[styles.pulse, { backgroundColor: colors.accent, opacity: pulse, marginTop: spacing.lg }]} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  details: { alignItems: 'center', maxWidth: 480 },
  muted: { opacity: 0.7 },
  pulse: { width: 40, height: 4, borderRadius: 2 },
});
