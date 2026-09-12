/** "Erik Satie(1866 – 1925)" -> "Erik Satie". MusicXML creators often carry dates. */
export function displayComposer(composer: string | null | undefined): string {
  if (!composer) return 'Unknown composer';
  return composer.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown composer';
}

/** "Ludwig van Beethoven" -> "Beethoven"; for tight spots like grid tiles. */
export function composerSurname(composer: string | null | undefined): string {
  const full = displayComposer(composer);
  if (full === 'Unknown composer') return 'Unknown';
  const parts = full.split(' ');
  return parts[parts.length - 1];
}
