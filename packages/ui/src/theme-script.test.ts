import { describe, expect, it } from 'vitest';
import { isColorPalette, themeInitScript } from './theme-script';

describe('color palette preference', () => {
  it('accepts only the four supported palettes', () => {
    expect(['dominion', 'ocean', 'ember', 'forest'].every(isColorPalette)).toBe(true);
    expect(isColorPalette('purple')).toBe(false);
    expect(isColorPalette(null)).toBe(false);
  });

  it('bootstraps theme and palette before the application paints', () => {
    expect(themeInitScript).toContain("dataset.theme=t");
    expect(themeInitScript).toContain("dataset.palette=ok?p:'dominion'");
  });
});
