// Dev helper: print notes with beats for expectation writing.
import { readFileSync } from 'node:fs';
import { loadScore } from '../src/engine/musicxml/load';
const { score } = loadScore(new Uint8Array(readFileSync(process.argv[2])));
console.log(`measures=${score.measures.length} durs=[${score.measures.map((m) => m.durationBeats).join(',')}] order=[${score.playbackOrder.join(',')}] parts=${score.partCount}`);
console.log(score.notes.slice(0, Number(process.argv[3] ?? 60)).map((n) => `${n.pitch}@${n.startBeat}${n.durationBeats !== 1 ? `x${n.durationBeats}` : ''}${n.hand !== 'unknown' ? n.hand[0].toUpperCase() : ''}`).join(' '));
