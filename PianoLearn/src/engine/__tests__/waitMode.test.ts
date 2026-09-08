import { buildEvents } from '../events';
import { parseMusicXml } from '../musicxml/parse';
import { WaitModeSession } from '../waitMode';
import { PIANO_XML } from '../testdata/fixtures';

const score = parseMusicXml(PIANO_XML);
const C3 = 48, G2 = 43, C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67;

describe('buildEvents', () => {
  it('groups simultaneous notes across hands', () => {
    const ev = buildEvents(score, 'both');
    expect(ev.map((e) => e.midis)).toEqual([
      [G4],            // pickup
      [C3, C4],        // m1 beat 1: LH whole + RH C4
      [D4], [E4], [F4],
      [C4, E4, G4],    // m2 chord (LH C3 is tied, no re-strike)
      [G4],            // m2 beat 3
      [G2],            // m3 LH
    ]);
    expect(ev.map((e) => e.measureIndex)).toEqual([0, 1, 1, 1, 1, 2, 2, 3]);
  });

  it('filters by hand', () => {
    expect(buildEvents(score, 'left').map((e) => e.midis)).toEqual([[C3], [G2]]);
    expect(buildEvents(score, 'right')).toHaveLength(7);
  });

  it('filters by measure range', () => {
    const ev = buildEvents(score, 'both', { start: 2, end: 2 });
    expect(ev.map((e) => e.midis)).toEqual([[C4, E4, G4], [G4]]);
  });
});

describe('WaitModeSession', () => {
  it('advances on correct single notes and stays on wrong ones', () => {
    const s = new WaitModeSession(buildEvents(score, 'right'));
    expect(s.state.remaining).toEqual([G4]);

    expect(s.noteOn(C4).verdict).toBe('wrong');
    expect(s.state.eventIndex).toBe(0);
    expect(s.state.wrongHeld).toEqual([C4]);
    s.noteOff(C4);
    expect(s.state.wrongHeld).toEqual([]);

    const r = s.noteOn(G4);
    expect(r).toMatchObject({ verdict: 'correct', advanced: true, eventIndex: 1 });
    expect(s.state.remaining).toEqual([C4]);
  });

  it('accumulate mode: chord notes count once struck, in any order', () => {
    const s = new WaitModeSession(buildEvents(score, 'right'), { chordMode: 'accumulate' });
    s.jumpToMeasure(2);
    expect(s.state.remaining).toEqual([C4, E4, G4]);

    expect(s.noteOn(G4)).toMatchObject({ verdict: 'correct', advanced: false });
    expect(s.noteOn(D4).verdict).toBe('wrong');
    expect(s.state.satisfied).toEqual([G4]); // lenient: keeps progress
    expect(s.noteOn(C4).advanced).toBe(false);
    expect(s.noteOn(E4)).toMatchObject({ verdict: 'correct', advanced: true });
    expect(s.state.remaining).toEqual([G4]);
  });

  it('held mode (default): chord notes must be down together', () => {
    const s = new WaitModeSession(buildEvents(score, 'right'));
    s.jumpToMeasure(2);
    expect(s.state.remaining).toEqual([C4, E4, G4]);

    s.noteOn(C4);
    expect(s.state.satisfied).toEqual([C4]);
    s.noteOff(C4);
    expect(s.state.satisfied).toEqual([]); // released = no longer counted
    expect(s.state.remaining).toEqual([C4, E4, G4]);

    s.noteOn(C4); s.noteOn(E4);
    expect(s.noteOn(D4).verdict).toBe('wrong');
    expect(s.state.satisfied).toEqual([C4, E4]); // wrong note doesn't undo held ones
    expect(s.noteOn(G4)).toMatchObject({ verdict: 'correct', advanced: true });
    expect(s.state.remaining).toEqual([G4]);
  });

  it('accumulate + strictChords resets progress on a wrong note', () => {
    const s = new WaitModeSession(buildEvents(score, 'right'), { chordMode: 'accumulate', strictChords: true });
    s.jumpToMeasure(2);
    s.noteOn(G4);
    s.noteOn(D4);
    expect(s.state.satisfied).toEqual([]);
  });

  it('finishes at the end of the song', () => {
    const s = new WaitModeSession(buildEvents(score, 'left'));
    expect(s.noteOn(C3).finished).toBe(false);
    const r = s.noteOn(G2);
    expect(r.finished).toBe(true);
    expect(s.state.finished).toBe(true);
    expect(s.noteOn(C3).verdict).toBe('ignored');
    s.restart();
    expect(s.state).toMatchObject({ eventIndex: 0, finished: false });
  });

  it('loops a measure range', () => {
    const s = new WaitModeSession(buildEvents(score, 'right'), { loop: { start: 2, end: 2 } });
    expect(s.state.remaining).toEqual([C4, E4, G4]);
    s.noteOn(C4); s.noteOn(E4); s.noteOn(G4);
    expect(s.state.remaining).toEqual([G4]);
    const r = s.noteOn(G4);
    expect(r.finished).toBe(false);
    expect(s.state.remaining).toEqual([C4, E4, G4]); // wrapped
    expect(s.current?.measureIndex).toBe(2);
  });

  it('setLoop moves the cursor into range when outside it', () => {
    const s = new WaitModeSession(buildEvents(score, 'both'));
    s.setLoop({ start: 3, end: 3 });
    expect(s.state.remaining).toEqual([G2]);
    s.setLoop(undefined);
    s.noteOn(G2);
    expect(s.state.finished).toBe(true);
  });
});
