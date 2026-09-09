/**
 * Conformance against the (unofficial) MusicXML test suite in
 * ../../../../scores/testsuite. Two layers:
 *  1. every file parses and satisfies the score invariants;
 *  2. hand-verified expectations for the features that decide which notes
 *     the user is asked to play and when.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildEvents } from '../events';
import { checkScoreInvariants } from '../invariants';
import { loadScore } from '../musicxml/load';

const DIR = join(__dirname, '../../../../scores/testsuite');
const load = (name: string) => loadScore(new Uint8Array(readFileSync(join(DIR, `${name}.musicxml`)))).score;
const notes = (name: string, count = 1000) =>
  load(name).notes.slice(0, count).map((n) => `${n.pitch}@${n.startBeat}`);

describe('MusicXML test suite: every file parses and is sane', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.musicxml')).sort();
  it('has the suite checked in', () => {
    expect(files.length).toBeGreaterThan(150);
  });
  it.each(files)('%s', (file) => {
    const { score } = loadScore(new Uint8Array(readFileSync(join(DIR, file))));
    expect(checkScoreInvariants(score)).toEqual([]);
  });
});

describe('MusicXML test suite: verified expectations', () => {
  it('01a pitches: chromatic naturals then sharps, one per beat', () => {
    const n = notes('01a-Pitches-Pitches', 34);
    expect(n.slice(0, 8)).toEqual(['G2@0', 'A2@1', 'B2@2', 'C3@3', 'D3@4', 'E3@5', 'F3@6', 'G3@7']);
    expect(n[31]).toBe('C7@31');
    expect(n[32]).toBe('G#2@32');
    expect(n[33]).toBe('A#2@33');
  });

  it('03a durations: from long (32 quarters) down to 256th', () => {
    const d = load('03a-Rhythm-Durations').notes.slice(0, 8).map((n) => n.durationBeats);
    expect(d).toEqual([32, 16, 8, 4, 2, 1, 0.5, 0.25]);
  });

  it('21a chord: two notes become one event', () => {
    const ev = buildEvents(load('21a-Chord-Basic'));
    expect(ev).toHaveLength(1);
    expect(ev[0].midis).toEqual([65, 69]); // F4 A4
  });

  it('23a tuplets: triplet eighths take 2/3 of a beat', () => {
    const s = load('23a-Tuplets');
    expect(s.notes.slice(0, 3).map((n) => n.startBeat)).toEqual([0, 2 / 3, 4 / 3]);
    expect(s.notes[0].durationBeats).toBeCloseTo(2 / 3);
  });

  it('24a grace notes are skipped; main notes and chords keep their beats', () => {
    const n = notes('24a-GraceNotes');
    expect(n).toEqual(['C5@0', 'C5@1', 'C5@2', 'C5@3', 'C5@4', 'C5@5', 'C5@6', 'C5@7', 'F4@8', 'C5@8', 'C5@9', 'C5@10']);
  });

  it('42a two voices on one staff interleave correctly', () => {
    expect(notes('42a-MultiVoice-TwoVoicesOnStaff-Lyrics', 6)).toEqual(['C5@0', 'E5@0', 'B4@2', 'D5@2', 'G4@3', 'B4@3']);
  });

  it('43a piano staff: staff 1 is right hand, staff 2 is left', () => {
    const s = load('43a-PianoStaff');
    expect(s.notes.map((n) => [n.pitch, n.hand])).toEqual([['B2', 'left'], ['F4', 'right']]);
  });

  it('45a simple repeat with times=5', () => {
    expect(load('45a-SimpleRepeat').playbackOrder).toEqual([0, 0, 0, 0, 0, 1]);
  });

  it('45b first and second ending', () => {
    expect(load('45b-RepeatWithAlternatives').playbackOrder).toEqual([0, 1, 0, 2, 3]);
  });

  it('45c repeats with times=5 and times=3', () => {
    expect(load('45c-RepeatMultipleTimes').playbackOrder).toEqual(
      [0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 3, 4, 5, 6, 3, 4, 5, 6, 3, 4, 5, 6, 7],
    );
  });

  it('45d endings numbered 1, 2, "3,5,7", "4,6", 8 give eight passes', () => {
    expect(load('45d-Repeats-MultipleEndings').playbackOrder).toEqual(
      [0, 1, 0, 2, 3, 4, 0, 5, 6, 7, 8, 0, 9, 0, 5, 6, 7, 8, 0, 9, 0, 5, 6, 7, 8, 0, 10, 11],
    );
  });

  it('45e unnumbered endings, back-to-back repeats, a repeat opening inside an ending', () => {
    expect(load('45e-Repeats-Combination').playbackOrder).toEqual([0, 1, 0, 2, 3, 4, 4, 5, 6, 5, 7, 8, 7, 8, 9]);
  });

  it('46d pickup and implicit (split) measures keep note positions', () => {
    const s = load('46d-PickupMeasure-ImplicitMeasures');
    expect(s.measures.map((m) => m.durationBeats)).toEqual([1.5, 2, 2, 3]);
    expect(notes('46d-PickupMeasure-ImplicitMeasures')).toEqual(['E4@0', 'E4@1', 'F4@1.5', 'G4@2.5', 'A4@3.5', 'B4@4.5', 'C5@5.5', 'D5@6.5']);
  });

  it('46e a second voice that starts later via <forward>', () => {
    expect(notes('46e-PickupMeasure-SecondVoiceStartsLater')).toEqual(['C5@0', 'C5@1', 'C4@2', 'C4@5', 'C5@5']);
  });

  it('11c additive time signature 3+2/8 keeps notes inside their measures', () => {
    const s = load('11c-TimeSignatures-Complex');
    expect(s.measures[0].timeSignature.label).toBe('3+2/8');
    expect(s.measures[0].timeSignature.quarters).toBe(2.5);
  });

  it('72a transposing instruments sound at concert pitch', () => {
    const s = load('72a-TransposingInstruments');
    const beat0 = s.notes.filter((n) => n.startBeat === 0).map((n) => n.midi);
    expect(beat0).toEqual([60, 60, 60]); // trumpet in Bb, horn in Eb, piano all sound C4
  });
});
