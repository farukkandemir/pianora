/**
 * Loads a score from raw file bytes, whether the file is plain MusicXML or a
 * compressed .mxl archive. Detection is by content (zip magic bytes), not by
 * file extension, because users rename things.
 */
import { strFromU8, unzipSync } from 'fflate';

import { Score } from '../model';
import { MusicXmlError, parseMusicXml } from './parse';
import { attrsOf, child, findRoot, parseXml } from './xml';

export interface LoadedScore {
  /** Uncompressed MusicXML text, ready for the sheet renderer. */
  xml: string;
  score: Score;
}

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** Returns the MusicXML text inside an .mxl archive or a plain file. */
export function readMusicXmlText(bytes: Uint8Array): string {
  if (!isZip(bytes)) return decodeUtf8(bytes);

  const files = unzipSync(bytes);
  let rootFile: string | undefined;

  const container = files['META-INF/container.xml'];
  if (container) {
    const c = findRoot(parseXml(strFromU8(container)), 'container');
    const rootfiles = c ? child(c, 'rootfiles') : undefined;
    const first = rootfiles ? child(rootfiles, 'rootfile') : undefined;
    rootFile = first ? attrsOf(first)['full-path'] : undefined;
  }
  if (!rootFile || !files[rootFile]) {
    rootFile = Object.keys(files).find((n) => !n.startsWith('META-INF/') && /\.(musicxml|xml)$/i.test(n));
  }
  if (!rootFile) throw new MusicXmlError('MXL archive contains no MusicXML file');
  return strFromU8(files[rootFile]);
}

export function loadScore(bytes: Uint8Array): LoadedScore {
  const xml = readMusicXmlText(bytes);
  return { xml, score: parseMusicXml(xml) };
}

function decodeUtf8(bytes: Uint8Array): string {
  // Strip a UTF-8 BOM if present; some Windows exports include one.
  const start = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return strFromU8(start ? bytes.subarray(start) : bytes);
}
