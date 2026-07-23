/**
 * Theme bootstrap. `themeInitScript` runs in the document <head> before paint,
 * so the correct theme is applied with no flash of the wrong colors. It is a
 * plain string (no React) intentionally, so a server component can inline it via
 * dangerouslySetInnerHTML.
 */
export const THEME_STORAGE_KEY = 'ksp-theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='light'||s==='dark')?s:(m?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;
