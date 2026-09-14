# First-run onboarding research

13 Sep 2026. Done before onboarding was built. The build followed option B below and shipped on 13 Sep (see `docs/superpowers/plans/2026-09-13-onboarding.md`).

## Decision

Option B, chosen by the owner: one Welcome screen, one "Pick a first piece" screen, then the real practice screen with a one-time "Pair your piano" sheet, plus a "Piano not in the list?" checklist on the Connect tab after a failed pairing. No slides, no quiz, no account. Level chips on the first-piece screen reuse the catalogue's beginner, intermediate and advanced tags.

## Evidence

- Tutorials do not help. Nielsen Norman Group tested 70 iOS users across four apps: task success 91 % with a tutorial vs 94 % without, and the tutorial group rated the apps significantly harder.
- Apple HIG: onboarding should be "fast, fun, and optional"; prefer tips in place over linear flows; never request a permission at launch unless the app cannot function without it; a custom pre-permission screen gets exactly one button and no skip.
- Time to value drives retention: users reaching the core action in session one show two to three times Day-7 retention (Appcues citing AppsFlyer, vendor). Duolingo gained about 20 % daily users by pushing sign-up later.
- Short flows finish: four-step flows complete best; past five, more than half drop (Chameleon, vendor, web data).
- Hardware pairing: Apple's own guidance for accessory setup is context first and "bind the picker to a button, so that the setup experience is always user-initiated". Nielsen Norman on smart devices: one task per screen, show what the device should do, specific errors with a retry from the failure point.

## How the piano apps onboard

Simply Piano: one motivational screen, ~15 screens of profile questions, a mic "magic demo", free first lesson, hard paywall after lesson one. Flowkey: one welcome screen, account required, ~25 screens, MIDI in Settings only. Yousician: one welcome, ~23 screens, account with email verification, MIDI optional. Skoove: account, level, genres, MIDI users calibrate lowest and highest key. Piano Marvel: account, three questions, dashboard. Synthesia: no questions, play immediately.

All: one welcome screen, never a carousel; a short profile quiz whose answers pick the first lesson; a free first piece before any gate; microphone as the default input, MIDI as an upgrade. Complaints, in order: trials that need a card and auto-renew; mic recognition failing; thin free tiers; beginners not told where to start. Nobody complains the quiz is too long.

piano.learn is MIDI-only, so pairing matters more, but it still should not be the first step. Piece first, piano second.

## The two hard moments

Pairing: Apple's `CABTMIDICentralViewController` cannot be customised. Failure points from Roland, Casio, Yamaha and Korg support pages and the piano-app help centres: keyboard paired in iOS Settings first (shows connected, sends no notes); keyboard in the wrong Bluetooth mode; another app holding the keyboard; Bluetooth permission denied; since iOS 16 iOS itself reconnects paired BLE MIDI.

Files: a new user has no MusicXML file on the phone. MuseScore.com requires a login to download; IMSLP is almost entirely PDF. The realistic route is Safari download, Files, share, "Copy to piano.learn", which needs the app to declare the file types (not done yet). Every import-based score app bundles free content or embeds a catalogue; the bundled catalogue is the first-piece path.

## What was wrong before the build (from the code)

- The Bluetooth permission alert fired at first launch: auto-reconnect created the Bluetooth manager before checking for a remembered piano. Fixed 13 Sep (`MIDI: ask for Bluetooth on Pair, not at launch`).
- The empty Library pointed only at the file picker, not at Browse.
- No piano connected showed only "· No keyboard" in a subtitle.
- Connect had no help for an empty pairing list.

## Still open

- Register the MusicXML file types so "Copy to piano.learn" works from Files, Mail and AirDrop. Separate change.
- The first-piece screen does not de-duplicate against pieces already in the library (only matters on an existing install).

## Sources

- Apple HIG, Onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding
- Apple HIG, Privacy and permissions: https://developer.apple.com/design/human-interface-guidelines/privacy
- WWDC24, Meet AccessorySetupKit: https://developer.apple.com/videos/play/wwdc2024/10203/
- CABTMIDICentralViewController: https://developer.apple.com/documentation/coreaudiokit/cabtmidicentralviewcontroller
- Core MIDI Bluetooth reconnection: https://developer.apple.com/documentation/coremidi/midi-bluetooth
- NN/G, Mobile tutorials study: https://www.nngroup.com/articles/mobile-tutorials/
- NN/G, Smart device onboarding: https://www.nngroup.com/articles/smart-device-onboarding/
- First Round, Duolingo delayed sign-up: https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/
- Chameleon benchmark report: https://www.chameleon.io/benchmark-report
- Appcues on retention: https://www.appcues.com/blog/app-retention-is-hard-heres-how-to-improve-it
- Retention.blog, Simply Piano teardown: https://www.retention.blog/p/simply-app-empire-part-2
- Pianist's Compass reviews (Simply Piano, Yousician, Skoove, Piano Marvel): https://pianistscompass.org/reviews/apps/
- Flowkey, connect your instrument: https://help.flowkey.com/en/articles/412853-connect-your-instrument-to-your-ipad
- Roland FP-30X Bluetooth: https://rolandcorp.com.au/blog/how-to-connect-your-roland-fp-30x-to-bluetooth-and-apps
- Casio Music Space manual: https://web.casio.com/app/en/music_space/manual/BIAJSYxwucwwjs.html
- Simply Piano, MIDI troubleshooting: https://piano-help.hellosimply.com/en/articles/2767684-troubleshooting-midi-on-your-apple-device
- MuseScore downloads need an account: https://musescore.org/en/node/302295
- IMSLP file formats: https://imslp.org/wiki/IMSLP:File_formats
- Registering a custom file type on iOS: https://rhonabwy.com/2023/07/22/getting-your-custom-file-type-recognized-by-ios-and-macos/
- Full page: https://claude.ai/code/artifact/4bd4af31-c9f0-40af-888e-57f4e2339fd0
