/**
 * Settings tab, from the Paper "Settings v2" artboard.
 */
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { HandSwatches } from '@/components/settings/HandSwatches';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsList';
import { useSettings } from '@/data/useSettings';
import { useMidiStatus } from '@/practice/useMidiStatus';
import { useTheme } from '@/theme';
import { Icon, Screen, Text, Toggle } from '@/ui';

const TRANSPORT_LABEL = { bluetooth: 'Bluetooth', usb: 'USB', network: 'Network', other: 'MIDI' } as const;

export default function SettingsTab() {
  const { settings, set } = useSettings();
  const { spacing } = useTheme();
  const router = useRouter();
  const piano = useMidiStatus()[0];

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.xxl }}>Settings</Text>
      <View style={{ gap: spacing.xxl }}>
        <SettingsGroup title="Practice">
          <SettingsRow
            title="Show on-screen keyboard"
            right={<Toggle value={settings.showKeyboard} onChange={(v) => set('showKeyboard', v)} accessibilityLabel="Show on-screen keyboard" />}
          />
        </SettingsGroup>

        <SettingsGroup title="Hands">
          <SettingsRow
            title="Right hand"
            subtitle="Notes and keys"
            right={<HandSwatches value={settings.rightHand} taken={settings.leftHand} onChange={(k) => set('rightHand', k)} />}
          />
          <SettingsRow
            title="Left hand"
            subtitle="Notes and keys"
            right={<HandSwatches value={settings.leftHand} taken={settings.rightHand} onChange={(k) => set('leftHand', k)} />}
          />
        </SettingsGroup>

        <SettingsGroup title="Piano">
          <SettingsRow
            title={piano?.name ?? 'No keyboard'}
            subtitle={piano ? `Connected · ${TRANSPORT_LABEL[piano.transport]}` : 'Tap to connect one'}
            subtitleTone={piano ? 'accent' : 'muted'}
            right={<Icon name="chevron-right" size={18} tone="faint" />}
            onPress={() => router.navigate('/connect')}
          />
          <SettingsRow
            title="Reconnect automatically"
            right={<Toggle value={settings.autoReconnect} onChange={(v) => set('autoReconnect', v)} accessibilityLabel="Reconnect automatically" />}
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow
            title="piano.learn"
            right={<Text variant="body" tone="muted">Version {Constants.expoConfig?.version ?? '1.0'}</Text>}
          />
          {/* CC BY 3.0 attribution for the sampled piano used by Listen. */}
          <SettingsRow title="Piano sound" subtitle="Salamander Grand Piano by Alexander Holm, CC BY 3.0" />
        </SettingsGroup>
      </View>
    </Screen>
  );
}
