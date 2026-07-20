import type { Config } from 'tailwindcss';
import rootConfig from '../../tailwind.config';

// Builds always run with this app directory as the working directory (Vercel
// Root Directory, `turbo build`, and `pnpm --filter` all `cd` here). Content
// globs must therefore be resolved relative to the app, not the repo root, or
// Tailwind finds no source files and emits an empty (unstyled) stylesheet.
const config: Config = {
  ...rootConfig,
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}'
  ]
};

export default config;
