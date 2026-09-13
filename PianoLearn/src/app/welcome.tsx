/**
 * Welcome, from the Paper "Welcome" artboard. Shown once, on the first launch.
 * The hero fills the screen; two washes in the page colour keep the type and
 * the button readable over it (same stretched-PNG trick as the Library card).
 */
import { useRouter, type Href } from 'expo-router';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkTheme, useTheme } from '@/theme';
import { Button, Icon, Text } from '@/ui';

const HERO = require('../../assets/images/hero-piano.jpg');
const WASH = {
  light: { top: require('../../assets/images/wash-top-light.png'), bottom: require('../../assets/images/wash-bottom-light.png') },
  dark: { top: require('../../assets/images/wash-top-dark.png'), bottom: require('../../assets/images/wash-bottom-dark.png') },
};

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const { width, height } = useWindowDimensions();
  // The theme carries no scheme flag; the page colour is the tell (see Navigator in _layout.tsx).
  const wash = colors.bg === darkTheme.colors.bg ? WASH.dark : WASH.light;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Hero, wider than the screen and centred, as on the board (634 wide on a 390 frame). */}
      <Image
        source={HERO}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={{ position: 'absolute', top: 0, left: (width - width * 1.63) / 2, width: width * 1.63, height }}
      />
      <Image source={wash.top} resizeMode="stretch" style={{ position: 'absolute', top: 0, left: 0, width, height: height * 0.545 }} accessibilityIgnoresInvertColors />
      <Image source={wash.bottom} resizeMode="stretch" style={{ position: 'absolute', bottom: 0, left: 0, width, height: height * 0.336 }} accessibilityIgnoresInvertColors />

      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + spacing.xxxl, paddingHorizontal: 28, gap: 14 }]}>
        <View style={styles.wordmark}>
          <Text variant="heading">piano</Text>
          <Text variant="heading">.</Text>
          <Text variant="heading" tone="accent">learn</Text>
        </View>
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
          <Text variant="display" center>Your piano.</Text>
          <Text variant="display" center>Your music.</Text>
        </View>
        <Text tone="muted" center>{'Bring any sheet music. Connect your piano.\nThe score waits for every note you play.'}</Text>
        <View style={styles.spacer} />
        <Button
          label="Get Started"
          variant="accent"
          block
          iconRight={<Icon name="arrow-right" size={18} tone="onAccent" />}
          // '/first-piece' isn't a typed route until Task 4 adds the file.
          onPress={() => router.push('/first-piece' as Href)}
        />
        <View style={[styles.compat, { gap: spacing.sm }]}>
          <Icon name="bluetooth" size={14} tone="muted" />
          <Text variant="caption" tone="muted">Works with Bluetooth and USB MIDI pianos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  spacer: { flex: 1 },
  compat: { flexDirection: 'row', alignItems: 'center', paddingTop: 2 },
});
