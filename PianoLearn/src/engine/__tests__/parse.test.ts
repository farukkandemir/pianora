import { parseMusicXml, MusicXmlError } from '../musicxml/parse';
import { totalBeats } from '../model';
import { PIANO_XML, TWO_PART_XML } from '../testdata/fixtures';

describe('parseMusicXml', () => {
  const score = parseMusicXml(PIANO_XML);

  it('reads metadata', () => {
    expect(score.title).toBe('Test Piece');
    expect(score.composer).toBe('A. Tester');
    expect(score.initialTempoBpm).toBe(90);
    expect(score.partCount).toBe(1);
  });

  it('builds measures with a pickup', () => {
    expect(score.measures.map((m) => m.durationBeats)).toEqual([1, 4, 4, 4]);
    expect(score.measures.map((m) => m.startBeat)).toEqual([0, 1, 5, 9]);
    expect(score.measures[0].number).toBe('0');
    expect(score.measures[1].timeSignature).toEqual({ beats: 4, beatType: 4, quarters: 4, label: '4/4' });
    expect(totalBeats(score)).toBe(13);
  });

  it('assigns hands by staff', () => {
    const right = score.notes.filter((n) => n.hand === 'right');
    const left = score.notes.filter((n) => n.hand === 'left');
    expect(right.every((n) => n.staff === 1)).toBe(true);
    expect(left.every((n) => n.staff === 2)).toBe(true);
    expect(left.map((n) => n.pitch)).toEqual(['C3', 'G2']);
  });

  it('computes absolute onsets and midi numbers', () => {
    const rh = score.notes.filter((n) => n.hand === 'right');
    expect(rh.map((n) => [n.pitch, n.startBeat])).toEqual([
      ['G4', 0],
      ['C4', 1],
      ['D4', 2],
      ['E4', 3],
      ['F4', 4],
      ['C4', 5],
      ['E4', 5],
      ['G4', 5],
      ['G4', 7],
    ]);
    expect(rh.find((n) => n.pitch === 'C4')?.midi).toBe(60);
  });

  it('merges ties into one note', () => {
    const c3 = score.notes.find((n) => n.pitch === 'C3')!;
    expect(c3.startBeat).toBe(1);
    expect(c3.durationBeats).toBe(8);
    const tiedG = score.notes.filter((n) => n.pitch === 'G4' && n.startBeat === 7);
    expect(tiedG).toHaveLength(1);
    expect(tiedG[0].durationBeats).toBe(3);
    // No separate note at measure 3 start on the right hand
    expect(score.notes.some((n) => n.hand === 'right' && n.startBeat === 9)).toBe(false);
  });

  it('handles accidentals and multiple parts', () => {
    const s = parseMusicXml(TWO_PART_XML);
    expect(s.title).toBe('Two Parts');
    expect(s.partCount).toBe(2);
    expect(s.measures[0].durationBeats).toBe(2);
    const p = s.notes.map((n) => [n.pitch, n.midi, n.hand]);
    expect(p).toEqual([
      ['C3', 48, 'left'],
      ['C#5', 73, 'right'],
      ['Bb4', 70, 'right'],
    ]);
    expect(s.initialTempoBpm).toBe(100);
  });

  it('rejects non-MusicXML', () => {
    expect(() => parseMusicXml('<html></html>')).toThrow(MusicXmlError);
  });
});

describe('score-timewise', () => {
  const XML = `<?xml version="1.0"?>
<score-timewise version="3.1">
  <movement-title>Timewise</movement-title>
  <part-list>
    <score-part id="P1"><part-name>RH</part-name></score-part>
    <score-part id="P2"><part-name>LH</part-name></score-part>
  </part-list>
  <measure number="1">
    <part id="P1">
      <attributes><divisions>1</divisions><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration></note>
    </part>
    <part id="P2">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>2</duration></note>
    </part>
  </measure>
  <measure number="2">
    <part id="P1"><note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration></note></part>
    <part id="P2"><note><pitch><step>G</step><octave>2</octave></pitch><duration>2</duration></note></part>
  </measure>
</score-timewise>`;

  it('parses the same as the partwise equivalent', () => {
    const s = parseMusicXml(XML);
    expect(s.title).toBe('Timewise');
    expect(s.partCount).toBe(2);
    expect(s.measures.map((m) => m.durationBeats)).toEqual([2, 2]);
    expect(s.notes.map((n) => `${n.pitch}@${n.startBeat}${n.hand[0]}`)).toEqual(['C3@0l', 'E4@0r', 'F4@1r', 'G2@2l', 'G4@2r']);
  });
});
