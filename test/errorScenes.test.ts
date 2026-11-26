import { describe, expect, it } from 'vitest';
import { LOST_DOC_LINES, eyeOffset, lostDocLine, padlockCaption } from '../src/lib/errorScenes';

describe('eyeOffset', () => {
  it('stays centred when the pointer is on the character', () => {
    expect(eyeOffset(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('never moves the pupils further than the limit', () => {
    for (const [dx, dy] of [[5000, 0], [-3000, 4000], [120, -90], [0, -999]]) {
      const { x, y } = eyeOffset(dx, dy, 3);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(3 + 1e-9);
    }
  });

  it('looks toward the pointer, and only a little when it is close', () => {
    const far = eyeOffset(600, 0, 3);
    const near = eyeOffset(60, 0, 3);
    expect(far.x).toBeCloseTo(3);
    expect(far.y).toBeCloseTo(0);
    expect(near.x).toBeGreaterThan(0);
    expect(near.x).toBeLessThan(far.x);
    expect(eyeOffset(0, -600, 3).y).toBeCloseTo(-3);
  });

  it('ignores non-finite input', () => {
    expect(eyeOffset(Number.NaN, 4)).toEqual({ x: 0, y: 0 });
  });
});

describe('lostDocLine', () => {
  it('says nothing until poked, then cycles through its lines', () => {
    expect(lostDocLine(0)).toBeNull();
    expect(lostDocLine(1)).toBe(LOST_DOC_LINES[0]);
    expect(lostDocLine(LOST_DOC_LINES.length)).toBe(LOST_DOC_LINES[LOST_DOC_LINES.length - 1]);
    expect(lostDocLine(LOST_DOC_LINES.length + 1)).toBe(LOST_DOC_LINES[0]);
  });
});

describe('padlockCaption', () => {
  it('counts the attempts and points to the owner after a few', () => {
    expect(padlockCaption(0)).toBeNull();
    expect(padlockCaption(1)).toBe('Masih terkunci.');
    expect(padlockCaption(2)).toBe('Gemboknya tetap setia.');
    expect(padlockCaption(5)).toMatch(/^Sudah 5 kali dicoba\. .*pemilik ruang kerja/);
  });
});
