import { buildMidiFile, toBase64 } from '../midiFile';
import type { Timeline } from '../timeline';

function tl(notes: [number, number, number][]): Timeline {
  return { notes: notes.map(([midi, startMs, endMs]) => ({ midi, startMs, endMs, measureIndex: 0, orderPos: 0 })), measures: [], totalMs: 0 };
}

/** Minimal reader for the format-0 files we write. */
function readEvents(bytes: Uint8Array) {
  expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
  const ppq = (bytes[12] << 8) | bytes[13];
  expect(String.fromCharCode(...bytes.slice(14, 18))).toBe('MTrk');
  const len = (bytes[18] << 24) | (bytes[19] << 16) | (bytes[20] << 8) | bytes[21];
  expect(bytes.length).toBe(22 + len);
  let i = 22, tick = 0;
  const out: { tick: number; status: number; data: number[] }[] = [];
  while (i < bytes.length) {
    let delta = 0;
    for (;;) { const b = bytes[i++]; delta = (delta << 7) | (b & 0x7f); if (!(b & 0x80)) break; }
    tick += delta;
    const status = bytes[i++];
    if (status === 0xff) { const type = bytes[i++]; const n = bytes[i++]; out.push({ tick, status, data: [type, ...bytes.slice(i, i + n)] }); i += n; }
    else out.push({ tick, status, data: [bytes[i++], bytes[i++]] });
  }
  return { ppq, out };
}

describe('buildMidiFile', () => {
  it('writes one tick per millisecond with note on/off pairs in order', () => {
    const { ppq, out } = readEvents(buildMidiFile(tl([[60, 0, 500], [64, 250, 1000]])));
    expect(ppq).toBe(500);
    expect(out[0]).toEqual({ tick: 0, status: 0xff, data: [0x51, 0x07, 0xa1, 0x20] }); // 500000 µs per quarter
    expect(out.slice(1).map((e) => [e.tick, e.status, e.data[0]])).toEqual([
      [0, 0x90, 60], [250, 0x90, 64], [500, 0x80, 60], [1000, 0x80, 64], [1001, 0xff, 0x2f],
    ]);
  });

  it('releases a repeated note before striking it again at the same tick', () => {
    const { out } = readEvents(buildMidiFile(tl([[60, 0, 500], [60, 500, 900]])));
    expect(out.slice(1, 4).map((e) => [e.tick, e.status])).toEqual([[0, 0x90], [500, 0x80], [500, 0x90]]);
  });

  it('encodes delta times above 127 as multi-byte quantities', () => {
    const { out } = readEvents(buildMidiFile(tl([[60, 0, 20000]])));
    expect(out[2]).toMatchObject({ tick: 20000, status: 0x80 });
  });
});

describe('toBase64', () => {
  it('matches the standard alphabet and padding', () => {
    expect(toBase64(new Uint8Array([77, 84, 104, 100]))).toBe('TVRoZA==');
    expect(toBase64(new Uint8Array([1, 2]))).toBe('AQI=');
    expect(toBase64(new Uint8Array([]))).toBe('');
  });
});
