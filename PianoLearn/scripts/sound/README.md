# Piano sound

The app plays the piece ("Listen") through Apple's built-in sampler loaded with a
SoundFont built from the Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0).
The SoundFont is not in git: the app downloads it once from the R2 bucket
`pianolearn-sounds`.

## Rebuild the SoundFont

1. Download the 16-bit set (488 MB) and extract it:
   https://archive.org/download/SalamanderGrandPianoV3/SalamanderGrandPianoV3_44.1khz16bit.tar.bz2
2. Build (stdlib Python, ~3 s):
   `python3 build_sf2.py <extracted folder> salamander-8v.sf2 8 8 1.5`
   Arguments: velocity layers (of 16), max seconds per sample, fade seconds.
   8 layers x 8 s = 302 MB. The full set would be 1.1 GB.
3. Check it in Apple's sampler and listen:
   `swiftc -O render_test.swift -o render_test && ./render_test salamander-8v.sf2 test.wav`
   Prints load time (0.1 s expected) and writes a 9 s phrase.
4. Upload to the bucket and update the URL and SHA-256 in the app's sound module.

Current file: salamander-8v.sf2, SHA-256
437de189aa5f73e5803ebeafa2e1ef2951620f9ac2f73ee1267af521c980cd56
