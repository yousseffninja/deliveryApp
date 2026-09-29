import { darkColors, lightColors, makeTheme } from '../src/theme';

describe('theme palettes', () => {
  it('light and dark palettes expose the exact same tokens', () => {
    expect(Object.keys(lightColors).sort()).toEqual(
      Object.keys(darkColors).sort(),
    );
  });

  it('no color token is missing from either palette', () => {
    for (const key of Object.keys(lightColors)) {
      const token = key as keyof typeof lightColors;
      expect(darkColors[token]).toBeTruthy();
      expect(lightColors[token]).toBeTruthy();
    }
  });

  it('makeTheme selects the requested palette and flags darkness', () => {
    expect(makeTheme(false).colors).toBe(lightColors);
    expect(makeTheme(false).isDark).toBe(false);
    expect(makeTheme(true).colors).toBe(darkColors);
    expect(makeTheme(true).isDark).toBe(true);
  });

  it('dark background is actually darker than light background', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(lum(darkColors.bg)).toBeLessThan(lum(lightColors.bg));
    expect(lum(darkColors.card)).toBeLessThan(lum(lightColors.card));
  });
});
