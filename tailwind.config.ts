import type { Config } from 'tailwindcss';

/**
 * KSP-OS design tokens.
 *
 * Colors are driven by CSS variables (space-separated RGB channels) declared in
 * each app's globals.css for the light theme (`:root`) and dark theme
 * (`:root[data-theme="dark"]`). Every token below reads a variable through the
 * `<alpha-value>` bridge so opacity utilities (`bg-brand/10`) keep working and a
 * single class set themes correctly in both modes.
 *
 * Brand: purple is primary (navigation, actions, brand); green (`accent`) is the
 * highlight / success / completed-progress hue — the KSP identity.
 */
const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: ['selector', ':root[data-theme="dark"]'],
  content: [
    './apps/command/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/portal/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/ui/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        canvas: withAlpha('--canvas'),
        surface: withAlpha('--surface'),
        'surface-2': withAlpha('--surface-2'),
        'surface-3': withAlpha('--surface-3'),
        overlay: withAlpha('--overlay'),
        ink: {
          DEFAULT: withAlpha('--ink'),
          2: withAlpha('--ink-2'),
          3: withAlpha('--ink-3'),
          4: withAlpha('--ink-4')
        },
        line: {
          DEFAULT: withAlpha('--line'),
          2: withAlpha('--line-2')
        },
        brand: {
          DEFAULT: withAlpha('--brand'),
          deep: withAlpha('--brand-strong'),
          strong: withAlpha('--brand-strong'),
          tint: withAlpha('--brand-tint')
        },
        'on-brand': withAlpha('--on-brand'),
        accent: {
          DEFAULT: withAlpha('--accent'),
          strong: withAlpha('--accent-strong'),
          tint: withAlpha('--accent-tint')
        },
        'on-accent': withAlpha('--on-accent'),
        good: { DEFAULT: withAlpha('--good'), tint: withAlpha('--good-tint') },
        warn: { DEFAULT: withAlpha('--warn'), tint: withAlpha('--warn-tint') },
        risk: { DEFAULT: withAlpha('--risk'), tint: withAlpha('--risk-tint') },
        // Legacy KSP names kept for the auth/setup screens — remapped onto the
        // new brand variables so those screens adopt the identity for free.
        executive: withAlpha('--brand'),
        paper: withAlpha('--canvas'),
        ksp: {
          blue: withAlpha('--brand'),
          navy: withAlpha('--ink'),
          graphite: withAlpha('--ink-2'),
          mist: withAlpha('--brand-tint'),
          line: withAlpha('--line')
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        focus: '0 0 0 3px rgb(var(--brand) / 0.35)'
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)'
      },
      transitionDuration: {
        fast: '120ms',
        DEFAULT: '200ms',
        slow: '320ms'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'fade-slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        // Exit counterparts — reverse of the entrances above, so overlays and
        // toasts leave the same way they arrived instead of snapping shut.
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' }
        },
        'scale-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.96)' }
        },
        'slide-out-right': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(16px)' }
        },
        'slide-out-down': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(8px)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.2, 0, 0, 1) both',
        'fade-slide-up': 'fade-slide-up 260ms cubic-bezier(0.2, 0, 0, 1) both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.2, 0, 0, 1) both',
        'slide-in-right': 'slide-in-right 240ms cubic-bezier(0.2, 0, 0, 1) both',
        'fade-out': 'fade-out 160ms cubic-bezier(0.2, 0, 0, 1) both',
        'scale-out': 'scale-out 160ms cubic-bezier(0.2, 0, 0, 1) both',
        'slide-out-right': 'slide-out-right 200ms cubic-bezier(0.2, 0, 0, 1) both',
        'slide-out-down': 'slide-out-down 200ms cubic-bezier(0.2, 0, 0, 1) both'
      }
    }
  },
  plugins: []
};

export default config;
