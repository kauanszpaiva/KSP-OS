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
        paper: '#f8fafc'
      }
    }
  },
  plugins: []
};

export default config;
