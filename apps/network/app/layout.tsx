import './globals.css';
import type { ReactNode } from 'react';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import { ThemeProvider, themeInitScript } from '@ksp/ui';

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
  title: 'KSP Network',
  description: 'Invite-only operating workspace for KSP partners and subcontractors.'
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
