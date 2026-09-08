import { strToU8, zipSync } from 'fflate';

import { isZip, loadScore, readMusicXmlText } from '../musicxml/load';
import { PIANO_XML } from '../testdata/fixtures';

describe('loadScore', () => {
  it('detects zip by magic bytes, not extension', () => {
    expect(isZip(strToU8('<score-partwise/>'))).toBe(false);
    expect(isZip(zipSync({ 'a.xml': strToU8(PIANO_XML) }))).toBe(true);
  });

  it('loads plain MusicXML, stripping a BOM', () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...strToU8(PIANO_XML)]);
    const { xml, score } = loadScore(withBom);
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(score.title).toBe('Test Piece');
  });

  it('loads an mxl archive and returns the inner xml', () => {
    const zip = zipSync({ 'song.musicxml': strToU8(PIANO_XML) });
    expect(readMusicXmlText(zip)).toBe(PIANO_XML);
    expect(loadScore(zip).score.measures).toHaveLength(4);
  });
});
