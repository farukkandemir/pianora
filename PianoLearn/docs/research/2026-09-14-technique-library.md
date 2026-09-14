# Technique library research

14 Sep 2026. Research before any decision on a curated shelf of technique exercises (scales, arpeggios, chord progressions, finger drills) organised by level, not a course. Nothing decided by the owner yet beyond wanting this.

## Core finding

No clean, commercially usable, ready-made MusicXML library of piano technique exercises exists.

| Source | Technique content | Format | Licence | Usable |
|---|---|---|---|---|
| MuseTrainer library (the catalogue's source) | none; 69 pieces, checked via the GitHub tree | MXL | public domain | nothing to take |
| IMSLP | scans of everything; engraved MusicXML only where a volunteer made one (Hanon 1 to 30 confirmed) | PDF, rare MusicXML | per file, typically CC BY-NC-SA | non-commercial blocks a paid app |
| MuseScore.com | many user uploads of Hanon, Czerny, Brahms; official Hanon book is Hal Leonard's | MSCZ, exports MusicXML | whatever the uploader set; a PD composition does not make the engraving PD | file by file, mostly no |
| PDMX dataset | 250k MuseScore scores filtered to PD; exercise coverage unknown | MXL | CC0 subset with a 12 % licence-conflict rate | unverified |
| PIG fingering dataset | 150 concert excerpts with fingering | custom text | academic only | no |
| Mutopia, OpenScore, CPDL | repertoire, songs, choral | LilyPond, MSCX, MXL | free | wrong content |

The compositions (Hanon, Czerny, Burgmüller) are public domain; the files are not. Options: engrave the study books from the scans, generate the pattern-based material, or both.

## Generation

Most "organised" technique is formulaic: one correct template per pattern, produced in 12 keys, both hands, standard fingering encoded per key family. music21 (Python, BSD) writes MusicXML with fingering marks; the musical rules must be authored by hand. No off-the-shelf scale-to-MusicXML generator with fingering exists.

Generated, clean rights: five-finger patterns (major and minor, 12 keys, each hand and together); scales (major, natural, harmonic, melodic minor; 1 and 2 octaves; hands separately and together; contrary motion; chromatic); arpeggios and broken chords, root and inversions; dominant and diminished sevenths; triads and inversions, solid and broken; cadences I IV V I; progressions (I V vi IV, ii V I, twelve-bar blues) in every key; Hanon 1 to 20 (sequential patterns, generated exactly, not copied).

Engraved by hand, later or never: Czerny Op. 599 selections (Grade 1 to 3), Burgmüller Op. 100 selections (Grade 3 to 5), Clementi sonatina movements. Hours per study; a curated dozen.

## Level ladder

ABRSM and RCM publish scale and arpeggio requirements per grade; public and teacher-recognised.

| Band | ABRSM grades | Scales | Arpeggios and chords |
|---|---|---|---|
| Starting | Initial, 1 | C G D F major, A D minor, hands separately, 2 octaves; C major contrary motion | broken chords in the same keys |
| Early | 2, 3 | adds A E B B♭ E♭ and more minors; hands together; chromatic from D | arpeggios hands separately, then together |
| Middle | 4, 5 | flat keys, C♯ G♯ C F minor; chromatic from any black key | arpeggios in all the above keys |
| Upper | 6 | all keys, 4 octaves, hands together | diminished sevenths |
| Advanced | 7, 8 | legato and staccato, thirds, sixths, scales a third apart | inversions, dominant sevenths resolving |

Grade 5 detail and ABRSM Initial were not fully confirmed (syllabus PDF blocked automated fetch). RCM adds metronome tempi per level and "formula patterns"; ABRSM does not time scales, which fits an app with no rhythm grading. Teachers' order for beginners: five-finger patterns first (hand does not move), then one-octave scales and chords, then full scales, arpeggios, cadences; sight reading throughout. Classic books map roughly: Czerny 599 and Hanon 1 to 20 for Grades 1 to 4; Burgmüller 100 and Hanon 21 to 43 for 3 to 6; Czerny 299 and Hanon 44 to 60 for 5 to 8; Brahms, Pischna, Dohnányi beyond. Fingering reference: Alfred's Complete Book of Scales, Chords, Arpeggios and Cadences (Palmer, Manus, Lethco); Faber's scale and chord book as the teaching sequence.

## What the course apps do

Simply Piano and Yousician: five-minute workouts and missions; forum verdict (review-site paraphrase) is that they do not drill scales. Flowkey: technique inside courses at intermediate and up. Piano Marvel: the serious one, technique trainer and sight-reading trainer with thousands of MIDI-checked exercises, level-gated, subscription. ABRSM Piano Scales Trainer: official app, Grades 1 to 5, notation with fingering, no MIDI, no Wait Mode. Standalone scale apps show fingering but do not listen to a piano. Nobody offers a plain shelf by level with a Wait Mode.

## What this means for piano.learn

1. Technique as a third kind of thing in Browse: skill families (five-finger, scales, arpeggios, chords and cadences, progressions, Hanon) by ABRSM level band. Same practice screen, same Wait Mode, loop and hands. No lessons, no order, no streaks.
2. Fingering on the sheet is required for this content to be worth anything. OSMD renders fingering marks; the parser must carry them through. Small engine change; check before planning.
3. Strict chords are an asset: cadences and progressions held together is the drill teachers want and only MIDI can judge.
4. Hands together and separately come free from hand mode.
5. Quality gate: every generated file played through on the phone by a pianist before release; one fingering reference for consistency.

Effort: the generator is pure logic with unit tests (per AGENTS); the musical authoring (fingering tables per key family, pattern definitions) is days, not weeks. Engraving study books is separate and optional.

## Decisions for the owner

1. Shape: a shelf in Browse by skill and level, not a course.
2. Generated patterns first; study books later or never.
3. Free, paid, or split by level (fits the pricing research's "ongoing value").
4. Who plays through the files before release.

## Sources

- MuseTrainer library: https://github.com/musetrainer/library
- IMSLP, Hanon: https://imslp.org/wiki/The_Virtuoso_Pianist_(Hanon,_Charles-Louis)
- IMSLP, Czerny Op. 599: https://imslp.org/wiki/Practical_Exercises_for_Beginners,_Op.599_(Czerny,_Carl)
- IMSLP, Burgmüller Op. 100: https://imslp.org/wiki/25_%C3%89tudes_faciles_et_progressives,_Op.100_(Burgm%C3%BCller,_Friedrich)
- MuseScore.com terms: https://musescore.com/legal/terms
- PDMX dataset: https://github.com/pnlong/PDMX/ and paper https://arxiv.org/abs/2409.10831
- PIG fingering dataset: https://beam.kisarazu.ac.jp/~saito/research/PianoFingeringDataset/index-ja.html
- music21 scale module: https://music21.org/music21docs/moduleReference/moduleScale.html
- pymusicxml: https://github.com/MarcTheSpark/pymusicxml
- ABRSM scales and arpeggios: https://ng.abrsm.org/en/our-exams/what-is-a-graded-music-exam/scales-and-arpeggios/
- Pianodao, ABRSM scales 2021: https://pianodao.com/2020/07/12/abrsm-piano-scales-2021/
- PianoTV, RCM Level 5: https://www.pianotv.net/2018/10/grade-5-rcm-technique-requirements/
- Alfred scales book: https://www.amazon.com/Complete-Scales-Chords-Arpeggios-Cadences/dp/0739003682
- Color In My Piano, five-finger patterns: https://colorinmypiano.com/2013/02/19/teaching-5-finger-patterns-with-a-free-worksheet/
- Pianodao, Burgmüller: https://pianodao.com/2023/03/26/discovering-burgmuller/
- Czerny by difficulty: https://pianofantasy.com/blog/the-magic-of-czerny-etudes-for-the-piano
- Simply Piano workouts: https://piano-help.hellosimply.com/en/articles/7939170-what-are-5-minute-workouts
- Piano Marvel SASR: https://pianomarvel.com/en/feature/sasr
- ABRSM Piano Scales Trainer: https://apps.apple.com/us/app/abrsm-piano-scales-trainer/id1511139245
- Full page: https://claude.ai/code/artifact/73e02331-d83d-40a2-ae57-e9edb0e26cb2
