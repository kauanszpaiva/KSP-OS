'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PALETTE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isColorPalette,
  type ColorPalette,
  type ResolvedTheme,
  type ThemePreference
} from './theme-script';
import { Icon } from './icons';

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  palette: ColorPalette;
  setPreference: (preference: ThemePreference) => void;
  setPalette: (palette: ColorPalette) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref;
}

function apply(theme: ResolvedTheme) {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme;
}

function applyPalette(palette: ColorPalette) {
  if (typeof document !== 'undefined') document.documentElement.dataset.palette = palette;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [theme, setTheme] = useState<ResolvedTheme>('light');
  const [palette, setPaletteState] = useState<ColorPalette>('dominion');

  // Hydrate from storage once mounted (the head script already painted correctly).
  useEffect(() => {
    let stored: ThemePreference = 'system';
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw === 'light' || raw === 'dark') stored = raw;
      const storedPalette = localStorage.getItem(PALETTE_STORAGE_KEY);
      if (isColorPalette(storedPalette)) {
        setPaletteState(storedPalette);
        applyPalette(storedPalette);
      }
    } catch {
      stored = 'system';
    }
    setPreferenceState(stored);
    setTheme(resolve(stored));
  }, []);

  // Track OS changes while the user is on "system".
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = systemTheme();
      setTheme(next);
      apply(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    const next = resolve(pref);
    setTheme(next);
    apply(next);
    try {
      if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      /* storage unavailable — the in-memory state still applies for this session. */
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const setPalette = useCallback((next: ColorPalette) => {
    setPaletteState(next);
    applyPalette(next);
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, next);
    } catch {
      /* storage unavailable — the in-memory state still applies for this session. */
    }
  }, []);

  const value = useMemo(
    () => ({ preference, theme, palette, setPreference, setPalette, toggle }),
    [preference, theme, palette, setPreference, setPalette, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/** Compact sun/moon toggle for the top bar. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const nextLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-3 transition-colors duration-fast hover:bg-surface-2 hover:text-ink sm:h-9 sm:w-9 ${className}`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
    </button>
  );
}

const PALETTES: Array<{ value: ColorPalette; label: string; colors: [string, string] }> = [
  { value: 'dominion', label: 'Dominion', colors: ['#8b2fc9', '#7ab314'] },
  { value: 'ocean', label: 'Ocean', colors: ['#2166bd', '#0ea5a8'] },
  { value: 'ember', label: 'Ember', colors: ['#be4638', '#dc9224'] },
  { value: 'forest', label: 'Forest', colors: ['#167960', '#81aa25'] }
];

/** A small, persisted accent chooser. Semantic good/warn/risk colors never change. */
export function PalettePicker({ className = '' }: { className?: string }) {
  const { palette, setPalette } = useTheme();
  return (
    <details className={`group relative ${className}`}>
      <summary
        aria-label="Choose color palette"
        title="Color palette"
        className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-ink-3 transition-colors duration-fast marker:hidden hover:bg-surface-2 hover:text-ink sm:h-9 sm:w-9 [&::-webkit-details-marker]:hidden"
      >
        <Icon name="palette" className="h-[18px] w-[18px]" />
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Color palette</p>
        {PALETTES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={palette === option.value}
            onClick={() => setPalette(option.value)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${palette === option.value ? 'bg-brand-tint font-semibold text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
          >
            <span className="flex -space-x-1" aria-hidden>
              <span className="h-4 w-4 rounded-full ring-2 ring-surface" style={{ backgroundColor: option.colors[0] }} />
              <span className="h-4 w-4 rounded-full ring-2 ring-surface" style={{ backgroundColor: option.colors[1] }} />
            </span>
            <span className="flex-1">{option.label}</span>
            {palette === option.value && <Icon name="check" className="h-3.5 w-3.5" />}
          </button>
        ))}
      </div>
    </details>
  );
}
