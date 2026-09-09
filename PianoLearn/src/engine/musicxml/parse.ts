/**
 * MusicXML (score-partwise) -> Score.
 *
 * Plain XML only; see load.ts for .mxl archives.
 * Supported: notes, chords, rests, ties, backup/forward, divisions changes,
 * time signatures, tempo (sound@tempo and metronome), multiple parts,
 * multiple staves per part. Grace notes and unpitched notes are skipped.
 */
import {
  Hand,
  Measure,
  Note,
  RepeatMarks,
  Score,
  TimeSignature,
  midiNumber,
  pitchFromMidi,
  pitchName,
} from '../model';
import { unrollRepeats } from '../unroll';
import {
  XNode,
  attrsOf,
  child,
  childText,
  childrenNamed,
  childrenOf,
  find,
  findRoot,
  hasChild,
  parseXml,
  tagOf,
  textOf,
} from './xml';

const DEFAULT_TEMPO = 100;
const EPS = 1e-6;

interface RawNote {
  midi: number;
  pitch: string;
  /** Offset within the measure, in quarter notes. */
  offsetBeats: number;
  durationBeats: number;
  staff: number;
  voice: number;
  tieStart: boolean;
  tieStop: boolean;
}

interface RawMeasure {
  number: string;
  notes: RawNote[];
  /** Furthest point reached by the cursor, in quarter notes. */
  lengthBeats: number;
  timeSignature?: TimeSignature;
  tempoBpm?: number;
  staffCount?: number;
  repeats?: RepeatMarks;
}

export class MusicXmlError extends Error {}

/** Parse an uncompressed .musicxml / .xml string. */
export function parseMusicXml(xml: string): Score {
  const doc = parseXml(xml);
  let root = findRoot(doc, 'score-partwise');
  if (!root) {
    const timewise = findRoot(doc, 'score-timewise');
    if (!timewise) throw new MusicXmlError('Not a MusicXML file (no <score-partwise> or <score-timewise> root)');
    root = timewiseToPartwise(timewise);
  }

  const workTitle = find(root, 'work', 'work-title');
  const title = childText(root, 'movement-title') || (workTitle ? textOf(workTitle) : undefined);
  const identification = child(root, 'identification');
  const composerNode = identification
    ? childrenNamed(identification, 'creator').find((c) => attrsOf(c).type === 'composer')
    : undefined;
  const composer = composerNode ? textOf(composerNode) : undefined;

  const parts = childrenNamed(root, 'part');
  if (parts.length === 0) throw new MusicXmlError('MusicXML file has no <part> elements');

  const rawParts = parts.map(parsePart);
  return assemble(rawParts, title, composer);
}

// ---------------------------------------------------------------------------

/**
 * <score-timewise> nests parts inside measures; we parse the partwise shape
 * (measures inside parts). Regroup the same nodes without copying content.
 */
function timewiseToPartwise(timewise: XNode): XNode {
  const partsById = new Map<string, XNode[]>();
  const others: XNode[] = [];
  for (const node of childrenOf(timewise)) {
    if (tagOf(node) !== 'measure') { others.push(node); continue; }
    const measureAttrs = attrsOf(node);
    for (const partNode of childrenNamed(node, 'part')) {
      const id = attrsOf(partNode).id ?? '';
      if (!partsById.has(id)) partsById.set(id, []);
      partsById.get(id)!.push({ measure: childrenOf(partNode), ':@': measureAttrs });
    }
  }
  const parts: XNode[] = [...partsById].map(([id, measures]) => ({ part: measures, ':@': { id } }));
  return { 'score-partwise': [...others, ...parts], ':@': attrsOf(timewise) };
}

function parsePart(part: XNode): RawMeasure[] {
  let divisions = 1;
  /** Semitones to add to written pitches to get sounding pitches (transposing instruments). */
  let transpose = 0;
  const out: RawMeasure[] = [];

  for (const m of childrenNamed(part, 'measure')) {
    const raw: RawMeasure = { number: attrsOf(m).number ?? String(out.length + 1), notes: [], lengthBeats: 0 };
    let cursor = 0; // in divisions
    let lastNoteStart = 0; // for <chord/>
    let maxCursor = 0;

    for (const el of childrenOf(m)) {
      const t = tagOf(el);
      switch (t) {
        case 'attributes': {
          const d = childText(el, 'divisions');
          if (d) divisions = Number(d);
          const time = child(el, 'time');
          if (time) {
            const ts = readTimeSignature(time);
            if (ts) raw.timeSignature = ts;
          }
          const staves = childText(el, 'staves');
          if (staves) raw.staffCount = Number(staves);
          const tr = child(el, 'transpose');
          if (tr) {
            const chromatic = Number(childText(tr, 'chromatic') ?? 0);
            const octaves = Number(childText(tr, 'octave-change') ?? 0);
            transpose = chromatic + 12 * octaves;
          }
          break;
        }
        case 'direction': {
          const tempo = readTempo(el);
          if (tempo && raw.tempoBpm === undefined) raw.tempoBpm = tempo;
          const sound = child(el, 'sound');
          if (sound) readJumpMarks(attrsOf(sound), raw);
          break;
        }
        case 'sound': {
          const a = attrsOf(el);
          if (a.tempo && raw.tempoBpm === undefined) raw.tempoBpm = Number(a.tempo);
          readJumpMarks(a, raw);
          break;
        }
        case 'barline': {
          readBarline(el, raw);
          break;
        }
        case 'backup': {
          cursor -= Number(childText(el, 'duration') ?? 0);
          if (cursor < 0) cursor = 0;
          break;
        }
        case 'forward': {
          cursor += Number(childText(el, 'duration') ?? 0);
          maxCursor = Math.max(maxCursor, cursor);
          break;
        }
        case 'note': {
          if (hasChild(el, 'grace')) break; // no duration; skip for V1
          const dur = Number(childText(el, 'duration') ?? 0);
          const isChord = hasChild(el, 'chord');
          const start = isChord ? lastNoteStart : cursor;
          if (!isChord) lastNoteStart = cursor;

          const pitch = child(el, 'pitch');
          if (pitch && !hasChild(el, 'rest')) {
            const step = childText(pitch, 'step') ?? 'C';
            const alter = Number(childText(pitch, 'alter') ?? 0);
            const octave = Number(childText(pitch, 'octave') ?? 4);
            const ties = childrenNamed(el, 'tie').map((x) => attrsOf(x).type);
            const written = midiNumber(step, alter, octave);
            raw.notes.push({
              midi: written + transpose,
              pitch: transpose === 0 ? pitchName(step, alter, octave) : pitchFromMidi(written + transpose),
              offsetBeats: start / divisions,
              durationBeats: dur / divisions,
              staff: Number(childText(el, 'staff') ?? 1),
              voice: Number(childText(el, 'voice') ?? 1),
              tieStart: ties.includes('start'),
              tieStop: ties.includes('stop'),
            });
          }
          if (!isChord) {
            cursor += dur;
            maxCursor = Math.max(maxCursor, cursor);
          } else {
            maxCursor = Math.max(maxCursor, start + dur);
          }
          break;
        }
        default:
          break;
      }
    }
    raw.lengthBeats = maxCursor / divisions;
    out.push(raw);
  }
  return out;
}

function readTempo(direction: XNode): number | undefined {
  const sound = child(direction, 'sound');
  const fromSound = sound ? attrsOf(sound).tempo : undefined;
  if (fromSound) return Number(fromSound);
  const metronome = find(direction, 'direction-type', 'metronome');
  if (metronome) {
    const perMinute = Number(childText(metronome, 'per-minute'));
    const unit = childText(metronome, 'beat-unit') ?? 'quarter';
    const dotted = hasChild(metronome, 'beat-unit-dot');
    if (perMinute > 0) return perMinute * beatUnitToQuarters(unit) * (dotted ? 1.5 : 1);
  }
  return undefined;
}

/**
 * <time> may hold several <beats>/<beat-type> pairs (3/8 + 3/4) and each
 * <beats> may be additive (3+2). The nominal length is the sum of all parts.
 */
function readTimeSignature(time: XNode): TimeSignature | undefined {
  const beatsList = childrenNamed(time, 'beats').map(textOf);
  const typeList = childrenNamed(time, 'beat-type').map(textOf);
  if (beatsList.length === 0 || typeList.length === 0) return undefined;
  let quarters = 0;
  const parts: string[] = [];
  for (let i = 0; i < beatsList.length; i++) {
    const nums = beatsList[i].split('+').map((x) => Number(x.trim())).filter((n) => n > 0);
    const beatType = Number(typeList[Math.min(i, typeList.length - 1)]);
    if (nums.length === 0 || !(beatType > 0)) return undefined;
    const sum = nums.reduce((a, b) => a + b, 0);
    quarters += (sum * 4) / beatType;
    parts.push(`${nums.join('+')}/${beatType}`);
  }
  const firstNums = beatsList[0].split('+').map((x) => Number(x.trim())).filter((n) => n > 0);
  return {
    beats: firstNums.reduce((a, b) => a + b, 0),
    beatType: Number(typeList[0]),
    quarters,
    label: parts.join('+'),
  };
}

function marks(raw: RawMeasure): RepeatMarks {
  return (raw.repeats ??= {});
}

function readBarline(el: XNode, raw: RawMeasure): void {
  const repeat = child(el, 'repeat');
  if (repeat) {
    const a = attrsOf(repeat);
    if (a.direction === 'forward') marks(raw).repeatForward = true;
    if (a.direction === 'backward') marks(raw).repeatBackward = { times: Number(a.times ?? 2) || 2 };
  }
  const ending = child(el, 'ending');
  if (ending) {
    const a = attrsOf(ending);
    if (a.type === 'start') {
      // Empty = unnumbered bracket; the unroller numbers those by position.
      const nums = String(a.number ?? '').split(/[,\s]+/).map(Number).filter((n) => n > 0);
      marks(raw).endingStart = nums;
    } else if (a.type === 'stop' || a.type === 'discontinue') {
      marks(raw).endingStop = true;
    }
  }
}

function readJumpMarks(a: Record<string, string>, raw: RawMeasure): void {
  if (a.segno !== undefined) marks(raw).segno = true;
  if (a.coda !== undefined) marks(raw).coda = true;
  if (a.dacapo === 'yes') marks(raw).daCapo = true;
  if (a.dalsegno !== undefined) marks(raw).dalSegno = true;
  if (a.tocoda !== undefined) marks(raw).toCoda = true;
  if (a.fine === 'yes') marks(raw).fine = true;
}

function beatUnitToQuarters(unit: string): number {
  switch (unit) {
    case 'whole': return 4;
    case 'half': return 2;
    case 'quarter': return 1;
    case 'eighth': return 0.5;
    case '16th': return 0.25;
    default: return 1;
  }
}

function assemble(rawParts: RawMeasure[][], title?: string, composer?: string): Score {
  const measureCount = Math.max(...rawParts.map((p) => p.length));
  const measures: Measure[] = [];
  let timeSig: TimeSignature = { beats: 4, beatType: 4, quarters: 4, label: '4/4' };
  let startBeat = 0;
  let initialTempo: number | undefined;

  for (let i = 0; i < measureCount; i++) {
    const slots = rawParts.map((p) => p[i]).filter((x): x is RawMeasure => !!x);
    const ts = slots.find((s) => s.timeSignature)?.timeSignature;
    if (ts) timeSig = ts;
    const nominal = timeSig.quarters;
    const observed = Math.max(0, ...slots.map((s) => s.lengthBeats));
    // Pickups are shorter than nominal: trust the content. Content longer
    // than nominal means the signature is wrong or missing: trust the content
    // too, so notes never fall outside their measure.
    const duration = observed > EPS ? observed : nominal;
    const tempo = slots.find((s) => s.tempoBpm !== undefined)?.tempoBpm;
    if (tempo !== undefined && initialTempo === undefined) initialTempo = tempo;

    const repeats = slots.reduce<RepeatMarks | undefined>(
      (acc, s) => (s.repeats ? { ...(acc ?? {}), ...s.repeats } : acc),
      undefined,
    );
    measures.push({
      index: i,
      number: slots[0]?.number ?? String(i + 1),
      startBeat,
      durationBeats: duration,
      timeSignature: timeSig,
      tempoBpm: tempo,
      repeats,
    });
    startBeat += duration;
  }

  const notes: Note[] = [];
  rawParts.forEach((part, partIndex) => {
    const staffCount = Math.max(1, ...part.map((m) => m.staffCount ?? 1));
    part.forEach((m, mi) => {
      const measure = measures[mi];
      for (const n of m.notes) {
        const hand = assignHand(partIndex, rawParts.length, n.staff, staffCount);
        const note: Note = {
          midi: n.midi,
          pitch: n.pitch,
          startBeat: measure.startBeat + n.offsetBeats,
          durationBeats: n.durationBeats,
          measureIndex: mi,
          staff: n.staff,
          voice: n.voice,
          hand,
          partIndex,
        };
        if (n.tieStop) {
          const prev = findTiePredecessor(notes, note);
          if (prev) {
            prev.durationBeats = note.startBeat + note.durationBeats - prev.startBeat;
            continue;
          }
        }
        notes.push(note);
      }
    });
  });

  notes.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);

  return {
    title: title || undefined,
    composer: composer || undefined,
    measures,
    notes,
    initialTempoBpm: initialTempo ?? DEFAULT_TEMPO,
    partCount: rawParts.length,
    playbackOrder: unrollRepeats(measures),
  };
}

function findTiePredecessor(notes: Note[], n: Note): Note | undefined {
  for (let i = notes.length - 1; i >= 0; i--) {
    const p = notes[i];
    if (p.partIndex !== n.partIndex) continue;
    if (p.startBeat + 8 < n.startBeat) break; // stop scanning far back
    if (
      p.midi === n.midi &&
      p.staff === n.staff &&
      Math.abs(p.startBeat + p.durationBeats - n.startBeat) < EPS
    ) {
      return p;
    }
  }
  return undefined;
}

/**
 * Hand assignment heuristic:
 * - a part with 2+ staves: staff 1 = right, staff 2+ = left
 * - exactly two parts, one staff each: part 0 = right, part 1 = left
 * - anything else (single staff, or an ensemble score): unknown = both hands
 */
function assignHand(partIndex: number, partCount: number, staff: number, staffCount: number): Hand {
  if (staffCount >= 2) return staff === 1 ? 'right' : 'left';
  if (partCount === 2) return partIndex === 0 ? 'right' : 'left';
  return 'unknown';
}
