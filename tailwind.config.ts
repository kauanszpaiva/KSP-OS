import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './apps/command/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/portal/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/ui/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (KSP operating system)
        canvas: '#f5f7fa',
        surface: '#ffffff',
        ink: {
          DEFAULT: '#0f2540',
          2: '#45536b',
          3: '#727f92',
          4: '#9aa5b4'
        },
        line: {
          DEFAULT: '#e5eaf1',
          2: '#d3dbe6'
        },
        brand: {
          DEFAULT: '#1f4e79',
          deep: '#0f2540',
          tint: '#eef3f9'
        },
        good: { DEFAULT: '#1f6f52', tint: '#e8f2ed' },
        warn: { DEFAULT: '#8a5a12', tint: '#f6efe1' },
        risk: { DEFAULT: '#a52a22', tint: '#f7e9e7' },
        // Legacy KSP names kept for the auth/setup screens
        executive: '#1f4e79',
        paper: '#f5f7fa',
        ksp: {
          blue: '#1f4e79',
          navy: '#0f2540',
          graphite: '#3a4356',
          mist: '#eef2f7',
          line: '#dbe2ec'
        }
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', '"Times New Roman"', 'serif']
      },
      borderRadius: {
        DEFAULT: '7px',
        md: '7px',
        lg: '10px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 37, 64, 0.04)',
        pop: '0 8px 28px rgba(15, 37, 64, 0.14)'
      }
    }
  },
  plugins: []
};

export default config;
