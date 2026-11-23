/**
 * Pure helpers behind the 404 / 403 illustrations (see src/ui/errorScenes.tsx),
 * kept free of React so they can be unit-tested.
 */

/**
 * How far a character's pupils move toward the pointer. `dx`/`dy` are the
 * pointer's distance from the character's centre in CSS pixels; the result is
 * in SVG units and never leaves a circle of radius `max`, so the eyes look
 * toward the cursor without sliding out of their sockets.
 */
export function eyeOffset(dx: number, dy: number, max = 3): { x: number; y: number } {
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist) || dist === 0) return { x: 0, y: 0 };
  // Ease in over the first ~240px so small movements near the face stay small.
  const reach = Math.min(1, dist / 240) * max;
  return { x: (dx / dist) * reach, y: (dy / dist) * reach };
}

/** What the lost document says each time it is poked, in order, looping. */
export const LOST_DOC_LINES = [
  'Bukan aku yang kamu cari.',
  'Aku juga lagi cari halamannya…',
  'Sudah kuperiksa semua laci. Nihil.',
  'Coba lewat Ringkasan, yuk.',
] as const;

export function lostDocLine(pokes: number): string | null {
  if (pokes <= 0) return null;
  return LOST_DOC_LINES[(pokes - 1) % LOST_DOC_LINES.length];
}

/** The padlock's reply after `tries` clicks. */
export function padlockCaption(tries: number): string | null {
  if (tries <= 0) return null;
  if (tries === 1) return 'Masih terkunci.';
  if (tries === 2) return 'Gemboknya tetap setia.';
  return `Sudah ${tries} kali dicoba. Minta akses ke pemilik ruang kerja, ya.`;
}
