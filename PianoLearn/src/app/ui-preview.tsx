import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Button, Card, Chip, IconButton, Screen, Segmented, Text, Toggle } from '@/ui';

/** Temporary gallery of the primitives. Delete once the real screens exist. */
export default function UiPreview() {
  const { spacing, colors } = useTheme();
  const [hands, setHands] = useState<'left' | 'right' | 'both'>('both');
  const [strict, setStrict] = useState(true);
  const [filter, setFilter] = useState('pieces');
  const gap = { gap: spacing.md } as const;
  const plus = <View style={{ width: 14, height: 2, backgroundColor: colors.onInk }} />;
  return (
    <Screen topInset={false}>
      <View style={{ gap: spacing.xxl }}>
        <View style={gap}>
          <Text variant="label" tone="muted">Text</Text>
          <Text variant="display">Your piano.</Text>
          <Text variant="title">My Library</Text>
          <Text variant="heading">Turn on Bluetooth on your piano</Text>
          <Text variant="subheading">Clair de Lune</Text>
          <Text>Any MusicXML file works. Export one from MuseScore, Sibelius or Finale.</Text>
          <Text variant="caption" tone="muted">Claude Debussy · Bar 24 of 72</Text>
          <Text variant="caption" tone="faint">.musicxml · .xml · .mxl</Text>
        </View>
        <View style={gap}>
          <Text variant="label" tone="muted">Buttons</Text>
          <Button label="Get Started" variant="accent" block />
          <Button label="Connect" variant="ink" size="md" />
          <Button label="Restart from bar 1" variant="muted" size="md" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton icon={plus} variant="ink" accessibilityLabel="Add" />
            <IconButton icon={plus} variant="surface" accessibilityLabel="Search" />
            <IconButton icon={plus} variant="muted" accessibilityLabel="Close" />
          </View>
        </View>
        <View style={gap}>
          <Text variant="label" tone="muted">Chips and segmented</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="Pieces" selected={filter === 'pieces'} onPress={() => setFilter('pieces')} />
            <Chip label="Composers" selected={filter === 'composers'} onPress={() => setFilter('composers')} />
            <Chip label="Wait Mode" accent />
          </View>
          <Segmented
            value={hands}
            onChange={setHands}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
              { value: 'both', label: 'Both' },
            ]}
          />
        </View>
        <View style={gap}>
          <Text variant="label" tone="muted">Cards and toggle</Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text variant="bodyStrong">Strict chords</Text>
                <Text variant="caption" tone="muted">Hold every note together</Text>
              </View>
              <Toggle value={strict} onChange={setStrict} accessibilityLabel="Strict chords" />
            </View>
          </Card>
          <Card variant="muted">
            <Text variant="bodyStrong">Not sure?</Text>
            <Text variant="caption" tone="muted">Check your piano’s manual for MIDI over Bluetooth or USB.</Text>
          </Card>
          <Card variant="floating">
            <Text variant="bodyStrong">Casio Privia</Text>
            <Text variant="caption" tone="muted">Found · Bluetooth</Text>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
