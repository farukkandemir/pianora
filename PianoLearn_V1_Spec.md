# PianoLearn V1 Spec

## Product Goal
PianoLearn helps beginners learn **the songs they actually want to play**.

Core promise:

> Upload a MusicXML song, connect a MIDI piano, and learn the piece interactively at your own pace.

PianoLearn is **not** a full piano curriculum like Flowkey or Simply Piano. V1 focuses on learning uploaded songs through interactive practice.

## Target User
Beginner or early-intermediate piano players who:
- own a digital piano / MIDI keyboard
- want to learn specific songs
- have MusicXML files for those songs
- prefer guided practice over a fixed lesson curriculum

## V1 Core Features

### 1. MusicXML Import
User can:
- import `.musicxml`, `.xml`, or `.mxl`
- see imported songs in a local song library
- open a song and start practicing

Parse at minimum:
- notes
- chords
- rests
- measures
- tempo
- time signature
- clefs
- left/right hand parts when available

### 2. Sheet Music Rendering
The practice screen must:
- render standard sheet music clearly
- highlight the current note/chord/measure
- follow the user's position through the song
- support jumping to a selected measure

Perfect engraving is not required for V1; reliability and readability are.

### 3. MIDI Connection
Support:
- Bluetooth MIDI where available
- USB MIDI where supported
- connection status
- reconnecting to a previously used keyboard

Receive:
- note-on
- note-off
- velocity when available

MIDI is the primary input method for V1.

### 4. Wait Mode
Main learning interaction:
1. Highlight next expected note/chord.
2. User plays on MIDI piano.
3. Compare played notes to expected notes.
4. If correct, advance.
5. If incorrect, stay in place and show the mismatch.

For chords, advance only when the required chord notes are satisfied.

### 5. Playback Controls
Include:
- play
- pause
- restart
- jump to beginning
- tempo control

Suggested tempo options:
- 25%
- 50%
- 75%
- 100%

A continuous slider is also acceptable.

### 6. Measure Looping
User can select a measure range and loop it continuously.

Example:
> Measures 12–16

### 7. Hand Practice
Modes:
- Right Hand
- Left Hand
- Both Hands

When one hand is selected, only that hand's notes are required in Wait Mode.

### 8. Keyboard Visualization
Show an on-screen piano keyboard that:
- highlights expected keys
- highlights keys the user actually plays
- distinguishes correct and incorrect input

### 9. Section Practice
User can:
- tap a measure to start there
- select a measure range
- practice only that range
- return to full-song mode easily

### 10. Local Progress
No account required in V1.

Store locally:
- imported songs
- last practiced measure
- tempo
- hand mode
- loop range
- recent practice position

## Main Screens

### 1. Onboarding
Keep it short:
1. Learn the songs you actually want to play.
2. Import MusicXML.
3. Connect your MIDI piano and start practicing.

No account creation.

### 2. Song Library
Show:
- imported songs
- title
- composer if available
- last practiced position
- import button

Primary CTA:
> Import Song

### 3. MIDI Setup
Show:
- available MIDI devices
- connected device
- connection state
- reconnect option

Also accessible from Settings.

### 4. Practice Screen
Contains:
- sheet music
- current-position highlight
- keyboard visualization
- play / pause / restart
- tempo
- hand selector
- Wait Mode
- loop controls
- MIDI status

This is the main product screen and should stay visually simple.

### 5. Practice Options
Secondary controls:
- hand mode
- tempo
- loop range
- start measure
- keyboard visibility
- optional metronome

Keep secondary controls out of the main UI when possible.

## Suggested Tech Stack

### App
- React Native
- Expo
- TypeScript
- Expo Router

### Local Storage
- SQLite

Use it for:
- song metadata
- parsed score data where practical
- progress
- preferences

### MIDI
Use a React Native-compatible MIDI solution or native module supporting:
- iOS CoreMIDI
- Android MIDI
- Bluetooth MIDI where possible

**Validate MIDI library choice before building the rest of the app.**

### MusicXML
Use MusicXML as the canonical imported score format.

Convert into an internal model containing:
- measures
- voices / parts
- notes
- rests
- durations
- pitch
- MIDI note number
- staff / hand
- timing information

### Sheet Rendering
Choose a renderer that supports:
- MusicXML reliably
- React Native directly or via WebView
- note/measure highlighting
- navigation to a measure
- access to note/measure positions if possible

**Validate sheet-rendering feasibility early.**

## Minimal Internal Data Model

### Song
- id
- title
- composer
- fileUri
- importedAt
- totalMeasures

### Measure
- index
- notes
- duration
- timeSignature

### Note
- pitch
- midiNumber
- duration
- staff
- voice
- startTime
- measureIndex

### SongProgress
- songId
- lastMeasure
- tempoPercent
- handMode
- loopStart
- loopEnd

## V1 Practice Logic
1. Parse imported MusicXML.
2. Build ordered expected note/chord events.
3. Connect MIDI input.
4. Receive MIDI events.
5. Compare input with the current expected event.
6. Mark correct / incorrect.
7. Advance when expected event is satisfied.
8. Update score and keyboard highlights.
9. Save progress locally.

Advanced rhythm grading is **not required** in V1.

Reliable note and chord matching matters more.

## V1 Non-Goals
Do **not** build yet:
- PDF sheet scanning
- photo-to-sheet OCR
- microphone note detection
- AI coaching
- mistake diagnosis
- fingering generation
- practice-plan generation
- full beginner curriculum
- social features
- teacher marketplace
- cloud sync
- user accounts
- web dashboard
- advanced analytics
- large gamification systems
- song marketplace

## Likely Post-V1 Features
Only add features that naturally help users learn a song:
- fingering suggestions
- simple practice plans
- warm-up exercises based on the song
- section difficulty labels
- gradual tempo progression
- hands-separate progression
- bookmarks / trouble spots
- song milestones
- simplified difficult passages
- PDF / photo import
- microphone input for acoustic piano

## V1 Success Criteria
A user can:
1. import a MusicXML song
2. connect a MIDI piano
3. open the score
4. select a section
5. practice in Wait Mode
6. see which keys to play
7. slow the piece down
8. practice one or both hands
9. loop difficult measures
10. close the app and continue later

If that flow feels smooth and useful, PianoLearn has a strong V1 foundation.
