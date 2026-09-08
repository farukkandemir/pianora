import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'PianoLearn' }} />
      <Stack.Screen name="sheet-spike" options={{ title: 'Sheet spike' }} />
      <Stack.Screen name="midi-setup" options={{ title: 'MIDI setup' }} />
    </Stack>
  );
}
