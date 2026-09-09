// Dev helper: parse every file in a folder and report throws / invariant
// violations. Usage: npx tsx scripts/sweep-corpus.ts ../scores/testsuite
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadScore } from '../src/engine/musicxml/load';
import { checkScoreInvariants } from '../src/engine/invariants';

const dir = process.argv[2] ?? '../scores/testsuite';
const files = readdirSync(dir).filter((f) => /\.(musicxml|xml|mxl)$/i.test(f)).sort();
let ok = 0;
const fails: string[] = [];
for (const f of files) {
  try {
    const { score } = loadScore(new Uint8Array(readFileSync(join(dir, f))));
    const problems = checkScoreInvariants(score);
    if (problems.length) fails.push(`${f}: INVARIANT ${problems.slice(0, 3).join('; ')}`);
    else ok++;
  } catch (e) {
    fails.push(`${f}: THROW ${(e as Error).message.slice(0, 90)}`);
  }
}
console.log(`ok ${ok} / ${files.length}`);
for (const f of fails) console.log(f);
