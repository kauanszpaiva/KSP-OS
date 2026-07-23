import './globals.css';
import type { ReactNode } from 'react';
import { Inter, Bricolage_Grotesque } from 'next/font/google';
import { ThemeProvider, themeInitScript } from '@ksp/ui';

/** Shares the command app's typographic identity — see apps/command/app/layout.tsx. */
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
  title: 'KSP Client Portal',
  description: 'Invite-only client portal for KSP Dominion Group projects, requests, approvals, billing, and deliverables.',
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
