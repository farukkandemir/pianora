/**
 * MIDI setup: list connected keyboards, open Bluetooth pairing, and show
 * incoming notes live. Doubles as the on-device MIDI spike.
 */
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addMidiListener,
  addSourcesListener,
  listSources,
  showBluetoothPairing,
  type MidiMessage,
  type MidiSource,
} from '../../modules/piano-midi';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (midi: number) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

export default function MidiSetupScreen() {
  const [sources, setSources] = useState<MidiSource[]>([]);
  const [lastNote, setLastNote] = useState<string>('—');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSources(listSources());
    } catch (e) {
      setError(String(e));
    }
    const sourcesSub = addSourcesListener(setSources);
    const midiSub = addMidiListener((m: MidiMessage) => {
      const line = describe(m);
      setLog((prev) => [line, ...prev].slice(0, 12));
      if (m.type === 'noteOn') setLastNote(`${noteName(m.note)}  (${m.note}, vel ${m.velocity})`);
    });
    return () => {
      sourcesSub.remove();
      midiSub.remove();
    };
  }, []);

  const pair = useCallback(async () => {
    try {
      await showBluetoothPairing();
      setSources(listSources());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.h}>Connected devices</Text>
      {sources.length === 0 ? (
        <Text style={styles.muted}>No MIDI devices found. Plug in a USB cable or pair over Bluetooth.</Text>
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.manufacturer || 'Unknown maker'} · {item.transport}{item.isOffline ? ' · offline' : ''}
              </Text>
            </View>
          )}
          style={styles.list}
        />
      )}

      <Pressable onPress={pair} style={styles.btn}>
        <Text style={styles.btnText}>Pair Bluetooth keyboard</Text>
      </Pressable>

      <Text style={styles.h}>Last note</Text>
      <Text style={styles.big}>{lastNote}</Text>

      <Text style={styles.h}>Incoming messages</Text>
      {log.map((l, i) => (
        <Text key={i} style={styles.mono}>{l}</Text>
      ))}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function describe(m: MidiMessage): string {
  switch (m.type) {
    case 'noteOn': return `noteOn  ${noteName(m.note).padEnd(4)} vel ${m.velocity} ch ${m.channel + 1}`;
    case 'noteOff': return `noteOff ${noteName(m.note).padEnd(4)}         ch ${m.channel + 1}`;
    case 'controlChange': return `cc ${m.controller} = ${m.value}`;
    default: return `other status ${m.status.toString(16)} ${m.data1} ${m.data2}`;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  h: { fontSize: 13, fontWeight: '600', color: '#666', textTransform: 'uppercase', marginTop: 12 },
  list: { maxHeight: 160 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  name: { fontSize: 16, fontWeight: '500' },
  muted: { color: '#777', fontSize: 13 },
  btn: { backgroundColor: '#2f80ed', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  big: { fontSize: 28, fontWeight: '600' },
  mono: { fontFamily: 'Menlo', fontSize: 12, color: '#333' },
  error: { color: '#b00020', marginTop: 8 },
});
