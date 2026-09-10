/** "Erik Satie(1866 – 1925)" -> "Erik Satie". MusicXML creators often carry dates. */
export function displayComposer(composer: string | null | undefined): string {
  if (!composer) return 'Unknown composer';
  return composer.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown composer';
}
