import type { Config } from 'tailwindcss';
export default { content: ['./apps/web/**/*.{ts,tsx}', './packages/ui/src/**/*.{ts,tsx}'], theme: { extend: { colors: { executive: '#1f4e79', paper: '#f8fafc' } } }, plugins: [] } satisfies Config;
