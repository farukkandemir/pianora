/**
 * Writes a Standard MIDI File (format 0) from a Timeline, so Apple's
 * sequencer can play it with sample-accurate timing. Ticks are milliseconds:
 * 500 ticks per quarter at 120 bpm (500 000 µs per quarter) makes one tick
 * exactly one millisecond, so no rounding beyond the millisecond happens here.
 *
 * Pure TypeScript, no React or native imports.
 */
import type { Timeline } from './timeline';

export const MIDI_PPQ = 500;
const TEMPO_US_PER_QUARTER = 500_000;
/** Velocity for every note: the score carries no dynamics yet. */
export const PLAYBACK_VELOCITY = 72;

interface MidiEvent { tick: number; order: number; bytes: number[] }

function vlq(n: number): number[] {
  const out = [n & 0x7f];
  n >>= 7;
  while (n > 0) { out.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return out;
}

function u32(n: number): number[] { return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]; }
function u16(n: number): number[] { return [(n >>> 8) & 0xff, n & 0xff]; }

export function buildMidiFile(timeline: Timeline, velocity = PLAYBACK_VELOCITY): Uint8Array {
  const events: MidiEvent[] = [];
  // Note-offs sort before note-ons at the same tick (order 0 < 1), so a
  // repeated note is released before it is struck again.
  for (const n of timeline.notes) {
    const on = Math.round(n.startMs);
    const off = Math.max(on + 1, Math.round(n.endMs));
    events.push({ tick: on, order: 1, bytes: [0x90, n.midi, velocity] });
    events.push({ tick: off, order: 0, bytes: [0x80, n.midi, 0] });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const track: number[] = [];
  // Tempo meta event at tick 0.
  track.push(...vlq(0), 0xff, 0x51, 0x03, (TEMPO_US_PER_QUARTER >> 16) & 0xff, (TEMPO_US_PER_QUARTER >> 8) & 0xff, TEMPO_US_PER_QUARTER & 0xff);
  let last = 0;
  for (const e of events) {
    track.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  // End of track, one tick after the last event so the sequencer reports the full length.
  track.push(...vlq(1), 0xff, 0x2f, 0x00);

  const header = [0x4d, 0x54, 0x68, 0x64, ...u32(6), ...u16(0), ...u16(1), ...u16(MIDI_PPQ)];
  const chunk = [0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track];
  return Uint8Array.from([...header, ...chunk]);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 without Buffer or btoa, so it runs in Hermes and in Jest alike. */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (b === undefined ? '=' : B64[(n >> 6) & 63]) + (c === undefined ? '=' : B64[n & 63]);
  }
  return out;
}
