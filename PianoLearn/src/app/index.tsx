import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function LibraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PianoLearn</Text>
      <Text>Song library coming soon.</Text>
      <Link href="/sheet-spike" style={styles.link}>Open sheet rendering spike</Link>
      <Link href="/midi-setup" style={styles.link}>MIDI setup</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
  link: { color: '#2f80ed', marginTop: 16 },
});
