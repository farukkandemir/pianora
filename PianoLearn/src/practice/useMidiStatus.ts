import { useEffect, useState } from 'react';

import { addSourcesListener, listSources, type MidiSource } from '../../modules/piano-midi';

/** Live list of connected MIDI sources. */
export function useMidiStatus(): MidiSource[] {
  const [sources, setSources] = useState<MidiSource[]>([]);
  useEffect(() => {
    try { setSources(listSources()); } catch { /* module unavailable */ }
    const sub = addSourcesListener(setSources);
    return () => sub.remove();
  }, []);
  return sources.filter((s) => !s.isOffline);
}
