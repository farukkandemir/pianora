// Dev helper: parse a MusicXML/MXL file and print a summary.
// Usage: npx tsx scripts/inspect-score.ts ../scores/foo.mxl
import { readFileSync } from 'node:fs';

import { buildEvents } from '../src/engine/events';
import { loadScore } from '../src/engine/musicxml/load';
import { totalBeats } from '../src/engine/model';

const path = process.argv[2];
const bytes = readFileSync(path);
const { score } = loadScore(new Uint8Array(bytes));

const hands = score.notes.reduce<Record<string, number>>((acc, n) => ((acc[n.hand] = (acc[n.hand] ?? 0) + 1), acc), {});
const events = buildEvents(score, 'both');
const chords = events.filter((e) => e.midis.length > 1).length;
const sigs = [...new Set(score.measures.map((m) => `${m.timeSignature.beats}/${m.timeSignature.beatType}`))];
const tempos = score.measures.filter((m) => m.tempoBpm !== undefined).map((m) => `m${m.index}:${m.tempoBpm}`);
const durs = [...new Set(score.measures.map((m) => m.durationBeats))];

console.log(`${score.title ?? '(no title)'} — ${score.composer ?? '(no composer)'}`);
console.log(`parts=${score.partCount} measures=${score.measures.length} notes=${score.notes.length} beats=${totalBeats(score)}`);
console.log(`hands=${JSON.stringify(hands)} events=${events.length} chords=${chords}`);
console.log(`timeSigs=${sigs.join(',')} measureDurations=${durs.join(',')} tempo=${score.initialTempoBpm} changes=[${tempos.join(' ')}]`);
console.log(`first events: ${events.slice(0, 6).map((e) => e.notes.map((n) => n.pitch).join('+')).join(' | ')}`);
const lo = Math.min(...score.notes.map((n) => n.midi)), hi = Math.max(...score.notes.map((n) => n.midi));
console.log(`midi range ${lo}-${hi}`);
