/**
 * Connect tab, from the Paper "Connect v2" artboards. Two states: nothing
 * connected (pair a piano) and connected (who, how, and the last note played
 * as proof the link works). Pairing itself is Apple's Bluetooth MIDI sheet.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { noteLabel } from '@/components/PianoKeyboard';
import { connectedPianos, useMidiStatus } from '@/practice/useMidiStatus';
import { useTheme } from '@/theme';
import { Button, Card, Icon, Screen, Text } from '@/ui';
import {
  addMidiListener,
  forgetKnownDevice,
  listKnownDevices,
  showBluetoothPairing,
  type KnownBluetoothDevice,
  type MidiSource,
} from '../../../modules/piano-midi';

const SCENE = require('../../../assets/images/connect-piano.jpg');
const TRANSPORT_LABEL = { bluetooth: 'Bluetooth', usb: 'USB', network: 'Network', other: 'MIDI' } as const;

export default function ConnectTab() {
  const { spacing, radius } = useTheme();
  const piano = useMidiStatus()[0];
  const [known, setKnown] = useState<KnownBluetoothDevice[]>(() => safeKnownDevices());
  const [lastNote, setLastNote] = useState<string | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const sub = addMidiListener((m) => { if (m.type === 'noteOn') setLastNote(noteLabel(m.note)); });
    return () => sub.remove();
  }, []);
  useEffect(() => { setKnown(safeKnownDevices()); if (piano) setHelp(false); }, [piano]);

  const pair = useCallback(async () => {
    try {
      await showBluetoothPairing();
    } catch {
      Alert.alert('Bluetooth is off', 'Turn on Bluetooth in Settings, then try again.');
    }
    setKnown(safeKnownDevices());
    // The list was dismissed: show the checklist only if nothing connected.
    setHelp(connectedPianos().length === 0);
  }, []);

  const remembered = piano ? known.find((d) => d.name === piano.name) : undefined;
  const forget = useCallback(() => {
    if (!remembered) return;
    forgetKnownDevice(remembered.id);
    setKnown(safeKnownDevices());
  }, [remembered]);

  return (
    <Screen tabBar>
      <Text variant="title" style={{ marginBottom: spacing.xxl }}>Connect</Text>
      <View style={{ gap: spacing.xxl }}>
        <Image source={SCENE} resizeMode="cover" style={[styles.scene, { borderRadius: radius.xl }]} accessibilityIgnoresInvertColors />
        {piano ? (
          <Connected piano={piano} lastNote={lastNote} onPair={pair} onForget={remembered ? forget : undefined} />
        ) : (
          <NotConnected onPair={pair} help={help} />
        )}
      </View>
    </Screen>
  );
}

function NotConnected({ onPair, help }: { onPair: () => void; help: boolean }) {
  const { spacing } = useTheme();
  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">Pair your piano</Text>
        <Text tone="muted">Turn on Bluetooth on the piano, then pick it from the list.</Text>
      </View>
      <View style={{ gap: spacing.lg }}>
        <Button label="Pair a Bluetooth piano" variant="accent" block iconLeft={<Icon name="bluetooth" size={18} tone="onAccent" />} onPress={onPair} />
        {help ? (
          <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
            <Text variant="subheading">Piano not in the list?</Text>
            <ChecklistItem>Turn on Bluetooth MIDI on the piano.</ChecklistItem>
            <ChecklistItem>Close other music apps.</ChecklistItem>
            <ChecklistItem>Pair here, not in iOS Settings.</ChecklistItem>
            <Pressable onPress={() => { Linking.openSettings().catch(() => {}); }} accessibilityRole="button">
              <ChecklistItem>Allow Bluetooth for piano.learn in Settings.</ChecklistItem>
            </Pressable>
          </View>
        ) : (
          <Text variant="caption" tone="faint" center>USB works too. Plug in and it connects on its own.</Text>
        )}
      </View>
    </>
  );
}

function ChecklistItem({ children }: { children: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: colors.accentInk }} />
      <Text tone="muted" style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

function Connected({ piano, lastNote, onPair, onForget }: {
  piano: MidiSource;
  lastNote: string | null;
  onPair: () => void;
  onForget?: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <>
      <Card padding={spacing.xl} style={{ gap: spacing.lg }}>
        <View style={styles.cardRow}>
          <View style={styles.cardText}>
            <Text variant="heading" numberOfLines={1}>{piano.name}</Text>
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: colors.correct }]} />
              <Text style={{ color: colors.correct }}>Connected · {TRANSPORT_LABEL[piano.transport]}</Text>
            </View>
          </View>
          <View style={styles.lastNote}>
            <View style={[styles.noteCircle, { backgroundColor: colors.accentTint, borderColor: colors.accentInk }]}>
              <Text variant="subheading" tone="accent">{lastNote ?? '–'}</Text>
            </View>
            <Text variant="micro" tone="faint" style={styles.noteLabel}>Last note</Text>
          </View>
        </View>
        <Text tone="muted">Press a key to see it here. This piano reconnects on its own next time.</Text>
      </Card>
      <View style={{ gap: spacing.md, alignItems: 'center' }}>
        <Button label="Pair a different piano" variant="muted" size="md" block onPress={onPair} />
        {onForget ? (
          <Pressable onPress={onForget} hitSlop={8} accessibilityRole="button">
            <Text variant="bodyStrong" tone="muted">Forget {piano.name}</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

function safeKnownDevices(): KnownBluetoothDevice[] {
  try { return listKnownDevices(); } catch { return []; }
}

const styles = StyleSheet.create({
  scene: { width: '100%', height: 210 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardText: { flex: 1, gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  lastNote: { alignItems: 'center', gap: 4 },
  noteCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  noteLabel: { textTransform: 'uppercase', letterSpacing: 0.4 },
});
