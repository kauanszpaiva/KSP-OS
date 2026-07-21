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
        executive: '#1f4e79',
        paper: '#f8fafc',
        ksp: {
          blue: '#1f4e79',
          navy: '#0f2540',
          graphite: '#3a4356',
          mist: '#eef2f7',
          line: '#dbe2ec'
        }
      }
    }
  },
  plugins: []
};

export default config;
