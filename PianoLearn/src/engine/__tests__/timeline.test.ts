import type { Measure, Note, Score } from '../model';
import { parseMusicXml } from '../musicxml/parse';
import { PIANO_XML } from '../testdata/fixtures';
import { buildTimeline, effectiveTempos, measureAtMs, notesStartingBetween, positionAtMs } from '../timeline';

const fixture = parseMusicXml(PIANO_XML);

function measure(index: number, startBeat: number, durationBeats: number, tempoBpm?: number): Measure {
  return { index, number: String(index + 1), startBeat, durationBeats, tempoBpm, timeSignature: { beats: 4, beatType: 4, quarters: 4, label: '4/4' } };
}
function note(midi: number, startBeat: number, durationBeats: number, measureIndex: number): Note {
  return { midi, pitch: '', startBeat, durationBeats, measureIndex, staff: 1, voice: 1, hand: 'right', partIndex: 0 };
}
function score(measures: Measure[], notes: Note[], playbackOrder?: number[]): Score {
  return { measures, notes, initialTempoBpm: 120, partCount: 1, playbackOrder: playbackOrder ?? measures.map((m) => m.index) };
}

describe('buildTimeline', () => {
  it('places notes in milliseconds at the written tempo', () => {
    // 120 bpm: 500 ms per quarter.
    const s = score([measure(0, 0, 4), measure(1, 4, 4)], [note(60, 0, 1, 0), note(62, 1.5, 0.5, 0), note(64, 4, 2, 1)]);
    const t = buildTimeline(s);
    expect(t.totalMs).toBe(4000);
    expect(t.measures.map((m) => [m.startMs, m.endMs])).toEqual([[0, 2000], [2000, 4000]]);
    expect(t.notes.map((n) => [n.midi, n.startMs, n.endMs])).toEqual([[60, 0, 500], [62, 750, 1000], [64, 2000, 3000]]);
  });

  it('applies a tempo mark from its measure onwards', () => {
    // m1 at 120 (2000 ms), m2 switches to 60 (4000 ms), m3 keeps 60.
    const s = score([measure(0, 0, 4), measure(1, 4, 4, 60), measure(2, 8, 4)], [note(60, 8, 1, 2)]);
    expect(effectiveTempos(s)).toEqual([120, 60, 60]);
    const t = buildTimeline(s);
    expect(t.measures.map((m) => m.startMs)).toEqual([0, 2000, 6000]);
    expect(t.totalMs).toBe(10000);
    expect(t.notes[0]).toMatchObject({ startMs: 6000, endMs: 7000 });
  });

  it('follows the performed order and repeats notes on every pass', () => {
    // |: m0 m1 :| m2 -> m0 m1 m0 m1 m2; the note in m1 sounds twice.
    const s = score([measure(0, 0, 4), measure(1, 4, 4), measure(2, 8, 4)], [note(67, 4, 1, 1)], [0, 1, 0, 1, 2]);
    const t = buildTimeline(s);
    expect(t.measures.map((m) => m.measureIndex)).toEqual([0, 1, 0, 1, 2]);
    expect(t.notes.map((n) => [n.startMs, n.orderPos])).toEqual([[2000, 1], [6000, 3]]);
    expect(t.totalMs).toBe(10000);
  });

  it('keeps the score-order tempo when a repeat jumps back', () => {
    // Tempo mark in m1; jumping back to m0 must play m0 at the initial tempo again.
    const s = score([measure(0, 0, 4), measure(1, 4, 4, 60)], [], [0, 1, 0, 1]);
    const t = buildTimeline(s);
    expect(t.measures.map((m) => m.endMs - m.startMs)).toEqual([2000, 4000, 2000, 4000]);
  });

  it('scales with tempoPercent', () => {
    const s = score([measure(0, 0, 4)], [note(60, 1, 1, 0)]);
    const t = buildTimeline(s, 50);
    expect(t.totalMs).toBe(4000);
    expect(t.notes[0]).toMatchObject({ startMs: 1000, endMs: 2000 });
  });

  it('works on a parsed score with a pickup and a sound tempo', () => {
    // Fixture: 4/4 at 90 bpm (666.67 ms per quarter), pickup measure first.
    const t = buildTimeline(fixture);
    expect(t.measures[0].measureIndex).toBe(0);
    expect(t.measures[0].msPerBeat).toBeCloseTo(666.667, 2);
    expect(t.notes.length).toBe(fixture.notes.length);
    const last = t.measures[t.measures.length - 1];
    expect(t.totalMs).toBe(last.endMs);
    for (let i = 1; i < t.notes.length; i++) expect(t.notes[i].startMs).toBeGreaterThanOrEqual(t.notes[i - 1].startMs);
  });
});

describe('lookups', () => {
  const s = score([measure(0, 0, 4), measure(1, 4, 4), measure(2, 8, 4)], [note(60, 0, 1, 0), note(62, 1, 1, 0), note(64, 4, 1, 1), note(65, 8, 4, 2)]);
  const t = buildTimeline(s);

  it('finds the measure and beat at a time', () => {
    expect(positionAtMs(t, 0)).toEqual({ measureIndex: 0, orderPos: 0, beatInMeasure: 0 });
    expect(positionAtMs(t, 2500)).toEqual({ measureIndex: 1, orderPos: 1, beatInMeasure: 1 });
    expect(positionAtMs(t, 5999)).toMatchObject({ measureIndex: 2 });
    expect(positionAtMs(t, 6000)).toBeUndefined();
    expect(measureAtMs(t, -5)?.measureIndex).toBe(0);
  });

  it('returns notes starting in a half-open window', () => {
    expect(notesStartingBetween(t, 0, 500).map((n) => n.midi)).toEqual([60]);
    expect(notesStartingBetween(t, 500, 2000).map((n) => n.midi)).toEqual([62]);
    expect(notesStartingBetween(t, 2000, 4001).map((n) => n.midi)).toEqual([64, 65]);
    expect(notesStartingBetween(t, 4001, 99999)).toEqual([]);
  });
});
