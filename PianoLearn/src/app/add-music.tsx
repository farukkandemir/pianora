/**
 * Add music, from the Paper artboard. A modal over the Library: pick a
 * MusicXML file, import it, and go straight into practice.
 */
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SheetIllustration } from '@/components/library/SheetIllustration';
import { useImportSong } from '@/data/useImportSong';
import { useTheme } from '@/theme';
import { Button, Icon, IconButton, Screen, Text, useCurtain } from '@/ui';

export default function AddMusicScreen() {
  const router = useRouter();
  const curtain = useCurtain();
  const { spacing } = useTheme();
  const { importFromPicker, busy } = useImportSong();

  const onChooseFile = async () => {
    const song = await importFromPicker();
    if (!song) return;
    await curtain.raise();
    router.back();
    router.push({ pathname: '/song/[id]', params: { id: song.id } });
  };

  return (
    <Screen scroll={false} topInset={false} style={{ gap: spacing.xxl, paddingTop: spacing.xl }}>
      <View style={styles.nav}>
        <Text variant="title">Add music</Text>
        <IconButton icon={<Icon name="x" size={16} />} variant="muted" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <SheetIllustration />
      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">Bring your own sheet music</Text>
        <Text tone="muted">Any MusicXML file works. Export one from MuseScore, Sibelius or Finale, or find free scores on MuseScore and IMSLP.</Text>
      </View>
      <View style={{ gap: spacing.lg }}>
        <Button
          label="Choose a file"
          variant="accent"
          block
          iconLeft={<Icon name="file" size={18} tone="onAccent" />}
          onPress={onChooseFile}
          disabled={busy}
        />
        <Text variant="caption" tone="faint" center>.musicxml · .xml · .mxl</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
