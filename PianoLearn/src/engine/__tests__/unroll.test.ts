import { buildEvents, firstEventInMeasure } from '../events';
import type { Measure, RepeatMarks } from '../model';
import { parseMusicXml } from '../musicxml/parse';
import { unrollRepeats } from '../unroll';

function measures(marks: (RepeatMarks | undefined)[]): Measure[] {
  return marks.map((repeats, index) => ({
    index, number: String(index + 1), startBeat: index * 4, durationBeats: 4,
    timeSignature: { beats: 4, beatType: 4 }, repeats,
  }));
}

describe('unrollRepeats', () => {
  it('returns natural order without repeats', () => {
    expect(unrollRepeats(measures([undefined, undefined, undefined]))).toEqual([0, 1, 2]);
  });

  it('plays a simple repeat twice', () => {
    const ms = measures([{ repeatForward: true }, undefined, { repeatBackward: { times: 2 } }, undefined]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 2, 0, 1, 2, 3]);
  });

  it('honours times=3', () => {
    const ms = measures([{ repeatForward: true }, { repeatBackward: { times: 3 } }, undefined]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 0, 1, 0, 1, 2]);
  });

  it('a bare backward repeat returns to the start of the piece', () => {
    const ms = measures([undefined, { repeatBackward: { times: 2 } }, undefined]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 0, 1, 2]);
  });

  it('a second bare backward repeat returns to after the previous repeat', () => {
    const ms = measures([undefined, { repeatBackward: { times: 2 } }, undefined, { repeatBackward: { times: 2 } }, undefined]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 0, 1, 2, 3, 2, 3, 4]);
  });

  it('takes first and second endings', () => {
    //  |: 0  1  [1. 2 :|] [2. 3 ] 4
    const ms = measures([
      { repeatForward: true }, undefined,
      { endingStart: [1], endingStop: true, repeatBackward: { times: 2 } },
      { endingStart: [2], endingStop: true },
      undefined,
    ]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 2, 0, 1, 3, 4]);
  });

  it('supports multi-measure and shared endings', () => {
    //  |: 0 [1,2. 1 2 :|] [3. 3 ] 4  with times=3
    const ms = measures([
      { repeatForward: true },
      { endingStart: [1, 2] },
      { endingStop: true, repeatBackward: { times: 3 } },
      { endingStart: [3], endingStop: true },
      undefined,
    ]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 2, 0, 1, 2, 0, 3, 4]);
  });

  it('handles D.C. al Fine', () => {
    const ms = measures([undefined, { fine: true }, undefined, { daCapo: true }]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 2, 3, 0, 1]);
  });

  it('handles D.S. al Coda and skips repeats after the jump', () => {
    //  0  [segno] 1(|:)  2(:|, to coda)  3  4(D.S.)  [coda] 5
    const ms = measures([
      undefined,
      { segno: true, repeatForward: true },
      { repeatBackward: { times: 2 }, toCoda: true },
      undefined,
      { dalSegno: true },
      { coda: true },
    ]);
    expect(unrollRepeats(ms)).toEqual([0, 1, 2, 1, 2, 3, 4, 1, 2, 5]);
  });

  it('never loops forever on malformed marks', () => {
    const ms = measures([{ repeatBackward: { times: 99 } }, { daCapo: true }]);
    const out = unrollRepeats(ms);
    expect(out.length).toBeLessThan(200);
  });
});

const REPEAT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>1</beats><beat-type>4</beat-type></time></attributes>
      <barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="2">
      <barline location="left"><ending number="1" type="start"/></barline>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>
      <barline location="right"><bar-style>light-heavy</bar-style><ending number="1" type="stop"/><repeat direction="backward"/></barline>
    </measure>
    <measure number="3">
      <barline location="left"><ending number="2" type="start"/></barline>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
      <barline location="right"><ending number="2" type="discontinue"/></barline>
    </measure>
    <measure number="4">
      <direction><direction-type><words>Fine</words></direction-type><sound fine="yes"/></direction>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="5">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
      <direction><direction-type><words>D.C. al Fine</words></direction-type><sound dacapo="yes"/></direction>
    </measure>
  </part>
</score-partwise>`;

describe('repeats from MusicXML', () => {
  const score = parseMusicXml(REPEAT_XML);

  it('parses barline and sound marks', () => {
    expect(score.measures[0].repeats).toEqual({ repeatForward: true });
    expect(score.measures[1].repeats).toEqual({ endingStart: [1], endingStop: true, repeatBackward: { times: 2 } });
    expect(score.measures[2].repeats).toEqual({ endingStart: [2], endingStop: true });
    expect(score.measures[3].repeats).toEqual({ fine: true });
    expect(score.measures[4].repeats).toEqual({ daCapo: true });
  });

  it('computes the performed order', () => {
    // 1 2 | 1 3 4 5 | D.C. -> 1 3 4(Fine)
    expect(score.playbackOrder).toEqual([0, 1, 0, 2, 3, 4, 0, 2, 3]);
  });

  it('builds events in performed order with pass numbers', () => {
    const ev = buildEvents(score, 'both');
    expect(ev.map((e) => e.notes[0].pitch)).toEqual(['C4', 'D4', 'C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4']);
    expect(ev.map((e) => e.pass)).toEqual([1, 1, 2, 1, 1, 1, 3, 2, 2]);
    expect(ev.map((e) => e.orderPos)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('jumps to the first occurrence of a measure', () => {
    const ev = buildEvents(score, 'both');
    expect(firstEventInMeasure(ev, 2)).toBe(3);
    expect(firstEventInMeasure(ev, 0)).toBe(0);
  });
});
