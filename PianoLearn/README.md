# piano.learn

Learn the piano pieces you actually want to play.

Import a MusicXML score or pick one from the built-in catalogue, connect a MIDI
keyboard over Bluetooth or USB, and practise in Wait Mode: the score highlights
the next note or chord, waits until you play it, then moves on.

- Sheet music with a cursor and an on-screen keyboard coloured by hand
- Wait Mode with real chords: every note held together before the cursor moves
- Loop any bars, practise one hand or both
- Listen to the piece at 50, 75 or 100 % with a sampled grand piano
- Everything stays on your device. No account.

iOS. Built with Expo and React Native.

## Run it

```bash
npm install
npx expo run:ios
```

Copy `.env.example` to `.env.local` and fill in the two values before the
first run.

## Checks

```bash
npm test
npm run typecheck
npx expo-doctor
```
