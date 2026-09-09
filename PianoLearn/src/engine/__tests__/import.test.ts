import { strToU8, zipSync } from 'fflate';

import { ImportError, validateForImport } from '@/data/songs';
import { PIANO_XML } from '../testdata/fixtures';

const kind = (bytes: Uint8Array) => {
  try { validateForImport(bytes); return 'ok'; } catch (e) { return e instanceof ImportError ? e.kind : 'other'; }
};

describe('validateForImport', () => {
  it('accepts a valid score', () => expect(kind(strToU8(PIANO_XML))).toBe('ok'));
  it('rejects non-MusicXML text', () => expect(kind(strToU8('<html><body>hi</body></html>'))).toBe('not-musicxml'));
  it('rejects a PDF', () => expect(kind(strToU8('%PDF-1.4 ...'))).toBe('not-musicxml'));
  it('rejects a damaged zip', () => expect(kind(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toBe('corrupt'));
  it('rejects an archive with no score inside', () => expect(kind(zipSync({ 'readme.txt': strToU8('x') }))).toBe('not-musicxml'));
  it('rejects a score with no notes', () => {
    const xml = PIANO_XML.replace(/<note>[\s\S]*?<\/note>/g, '');
    expect(kind(strToU8(xml))).toBe('no-notes');
  });
});
