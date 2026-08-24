/**
 * Theme bootstrap. `themeInitScript` runs in the document <head> before paint,
 * so the correct theme is applied with no flash of the wrong colors. It is a
 * plain string (no React) intentionally, so a server component can inline it via
 * dangerouslySetInnerHTML.
 */
export const THEME_STORAGE_KEY = 'ksp-theme';
export const PALETTE_STORAGE_KEY = 'ksp-palette';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type ColorPalette = 'dominion' | 'ocean' | 'ember' | 'forest';

export function isColorPalette(value: unknown): value is ColorPalette {
  return value === 'dominion' || value === 'ocean' || value === 'ember' || value === 'forest';
}

export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}',pk='${PALETTE_STORAGE_KEY}';var s=localStorage.getItem(k),p=localStorage.getItem(pk);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='light'||s==='dark')?s:(m?'dark':'light');var ok=p==='dominion'||p==='ocean'||p==='ember'||p==='forest';document.documentElement.dataset.theme=t;document.documentElement.dataset.palette=ok?p:'dominion';}catch(e){document.documentElement.dataset.theme='light';document.documentElement.dataset.palette='dominion';}})();`;
