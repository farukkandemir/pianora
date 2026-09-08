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
    expect(score.measures[1].timeSignature).toEqual({ beats: 4, beatType: 4 });
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
