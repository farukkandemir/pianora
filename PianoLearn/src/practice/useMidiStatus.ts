import { useEffect, useState } from 'react';

import { addSourcesListener, listSources, type MidiSource } from '../../modules/piano-midi';

/**
 * Live list of connected pianos: USB and Bluetooth MIDI sources that are
 * online. iOS also exposes network and virtual endpoints ("Network Session 1")
 * that no piano sits behind; those are left out everywhere.
 */
export function useMidiStatus(): MidiSource[] {
  const [sources, setSources] = useState<MidiSource[]>([]);
  useEffect(() => {
    try { setSources(listSources()); } catch { /* module unavailable */ }
    const sub = addSourcesListener(setSources);
    return () => sub.remove();
  }, []);
  return connectedPianos(sources);
}

/** Connected pianos right now: USB and Bluetooth MIDI sources that are online. */
export function connectedPianos(sources: MidiSource[] = listSources()): MidiSource[] {
  return sources.filter((s) => !s.isOffline && (s.transport === 'usb' || s.transport === 'bluetooth'));
}
