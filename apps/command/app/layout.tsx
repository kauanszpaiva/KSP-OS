import './globals.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { Inter, Bricolage_Grotesque } from 'next/font/google';
import { ThemeProvider, themeInitScript } from '@ksp/ui';

/**
 * KSP typographic identity — self-hosted by next/font at build time (no
 * runtime UI dependency added). Inter carries the UI/body and its tabular
 * figures (the app leans on `.tnum` heavily); Bricolage Grotesque is the
 * display face for titles, big figures and eyebrows — distinctive but
 * still operations-serious. Both expose CSS variables consumed by
 * globals.css / tailwind.config.
 */
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700']
});

export const metadata = {
  title: 'KSP Dominion Command OS',
  description: 'Governed operating system for KSP Dominion Group.'
};

/**
 * Explicit mobile viewport contract. `viewportFit: cover` lets the shell use
 * iOS safe-area insets correctly without disabling user zoom.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0e12' }
  ]
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
