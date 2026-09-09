/**
 * Expands repeat barlines, ending brackets and D.C./D.S./Coda/Fine marks
 * into the order measures are actually performed.
 *
 * Conventions follow MuseScore/Finale defaults:
 * - A backward repeat without a matching forward repeat returns to the start
 *   of the piece, or to just after the previous completed repeat.
 * - Endings apply to the current pass number of the enclosing repeat.
 * - After a D.C./D.S. jump, repeats are not taken again; "To Coda" and
 *   "Fine" only act after such a jump.
 */
import type { Measure } from './model';

export function unrollRepeats(input: Measure[]): number[] {
  const measures = numberUnnumberedEndings(input);
  const n = measures.length;
  const order: number[] = [];
  if (n === 0) return order;

  const marks = (i: number) => measures[i].repeats ?? {};
  let i = 0;
  let repeatStart = 0;
  let pass = 1; // pass number within the current repeat
  let afterJump = false; // set after D.C. / D.S. was taken
  let jumpTaken = false;
  const guard = n * 32 + 64;

  while (i < n && order.length < guard) {
    const m = marks(i);

    // Endings are judged against the enclosing repeat's pass, before any
    // forward repeat on this same measure opens a new (inner) repeat.
    if (m.endingStart && m.endingStart.length > 0 && !afterJump && !m.endingStart.includes(pass)) {
      i = findEndingStop(measures, i) + 1;
      continue;
    }
    if (m.endingStart && afterJump) {
      // After a D.C./D.S., play the last ending only.
      const last = lastEndingNumber(measures, i);
      if (!m.endingStart.includes(last)) { i = findEndingStop(measures, i) + 1; continue; }
    }

    if (m.repeatForward && !afterJump) {
      if (repeatStart !== i) { repeatStart = i; pass = 1; }
    }

    order.push(i);

    if (afterJump && m.fine) break;
    if (afterJump && m.toCoda) {
      const c = measures.findIndex((x) => x.repeats?.coda);
      if (c > i) { i = c; continue; }
    }

    if (m.repeatBackward && !afterJump) {
      // Endings decide the pass count: [1.] [2.] [3,5,7.] [4,6.] [8.] means 8 passes.
      const times = Math.max(2, m.repeatBackward.times || 2, maxEndingNumber(measures, repeatStart));
      if (pass < times) {
        pass += 1;
        i = repeatStart;
        continue;
      }
      // Repeat finished: later bare backward repeats return to here.
      repeatStart = i + 1;
      pass = 1;
    }

    if (!jumpTaken && (m.daCapo || m.dalSegno)) {
      jumpTaken = true;
      afterJump = true;
      if (m.daCapo) { i = 0; continue; }
      const s = measures.findIndex((x) => x.repeats?.segno);
      i = s >= 0 ? s : 0;
      continue;
    }

    i += 1;
  }
  return order;
}

/**
 * Brackets written without numbers ("first ending", "second ending" by
 * position) get 1, 2, ... within their group. Returns a shallow copy; the
 * caller's measures are untouched.
 */
function numberUnnumberedEndings(measures: Measure[]): Measure[] {
  let counter = 0;
  let inEnding = false;
  let sawEnding = false;
  return measures.map((m) => {
    const r = m.repeats;
    if (!r) {
      if (sawEnding && !inEnding) { counter = 0; sawEnding = false; }
      return m;
    }
    let out = m;
    if (r.endingStart) {
      if (!inEnding && sawEnding === false) counter = 0;
      inEnding = true;
      sawEnding = true;
      if (r.endingStart.length === 0) {
        counter += 1;
        out = { ...m, repeats: { ...r, endingStart: [counter] } };
      } else {
        counter = Math.max(counter, ...r.endingStart);
      }
    } else if (sawEnding && !inEnding) {
      counter = 0;
      sawEnding = false;
    }
    if (r.endingStop) inEnding = false;
    return out;
  });
}

function findEndingStop(measures: Measure[], start: number): number {
  for (let j = start; j < measures.length; j++) {
    if (measures[j].repeats?.endingStop) return j;
    if (j > start && measures[j].repeats?.endingStart) return j - 1;
  }
  return start;
}

/**
 * Highest ending number among the contiguous ending brackets that belong to
 * the repeat starting at `repeatStart`, or 0 if it has none.
 */
function maxEndingNumber(measures: Measure[], repeatStart: number): number {
  let best = 0;
  let inEnding = false;
  let sawEnding = false;
  for (let j = repeatStart; j < measures.length; j++) {
    const r = measures[j].repeats ?? {};
    if (r.endingStart) {
      inEnding = true;
      sawEnding = true;
      best = Math.max(best, ...r.endingStart);
    } else if (sawEnding && !inEnding) {
      break; // first plain measure after the ending group
    }
    if (r.endingStop) inEnding = false;
  }
  return best;
}

/** Highest ending number in the bracket group that starts at `start`. */
function lastEndingNumber(measures: Measure[], start: number): number {
  let best = 1;
  for (let j = start; j < measures.length; j++) {
    const e = measures[j].repeats?.endingStart;
    if (e) best = Math.max(best, ...e);
    else if (j > start && !measures[j].repeats?.endingStop && !measures[j - 1].repeats?.endingStop) break;
  }
  return best;
}
