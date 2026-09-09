/**
 * Sanity checks every parsed score must satisfy. Used by the corpus test and
 * by import, so a file that parses into nonsense is rejected rather than
 * saved.
 */
import { Score } from './model';

const PIANO_LOW = 21; // A0
const PIANO_HIGH = 108; // C8

export function checkScoreInvariants(score: Score): string[] {
  const problems: string[] = [];
  let lastStart = -Infinity;
  for (const m of score.measures) {
    if (m.startBeat < lastStart) problems.push(`measure ${m.index} starts before the previous one`);
    lastStart = m.startBeat;
    if (!(m.durationBeats > 0) || !Number.isFinite(m.durationBeats)) problems.push(`measure ${m.index} has duration ${m.durationBeats}`);
  }
  for (const n of score.notes) {
    if (!Number.isFinite(n.startBeat) || !Number.isFinite(n.durationBeats)) problems.push(`note ${n.pitch} has a non-finite time`);
    else if (n.durationBeats < 0) problems.push(`note ${n.pitch} has negative duration`);
    if (n.midi < PIANO_LOW || n.midi > PIANO_HIGH) problems.push(`note ${n.pitch} (${n.midi}) is outside the piano`);
    const m = score.measures[n.measureIndex];
    if (!m) problems.push(`note ${n.pitch} points at missing measure ${n.measureIndex}`);
    else if (n.startBeat < m.startBeat - 1e-6 || n.startBeat > m.startBeat + m.durationBeats + 1e-6) {
      problems.push(`note ${n.pitch} at beat ${n.startBeat} lies outside measure ${n.measureIndex}`);
    }
  }
  for (const i of score.playbackOrder) {
    if (i < 0 || i >= score.measures.length) problems.push(`playback order references measure ${i}`);
  }
  return [...new Set(problems)];
}
