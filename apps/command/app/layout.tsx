import './globals.css';
import './ksp-inc.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { ThemeProvider, themeInitScript } from '@ksp/ui';

/**
 * KSP INC operating typography.
 * Inter carries dense UI/body copy and tabular figures; Sora is the approved
 * display direction for headings, figures and operating labels.
 */
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});

const display = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700']
});

export const metadata = {
  title: 'KSP OS Command',
  description: 'Operating command center for KSP.'
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
    { media: '(prefers-color-scheme: light)', color: '#f2f2f2' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' }
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
