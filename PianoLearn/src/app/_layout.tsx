import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Songs' }} />
      <Stack.Screen name="midi-setup" options={{ title: 'MIDI setup' }} />
      <Stack.Screen name="song/[id]" options={{ title: 'Song' }} />
    </Stack>
  );
}
