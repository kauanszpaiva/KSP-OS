import './globals.css';
import './ksp-inc.css';
import type { ReactNode } from 'react';
import { Inter, Sora } from 'next/font/google';
import { ThemeProvider, themeInitScript } from '@ksp/ui';

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
  title: 'KSP OS Portal',
  description: 'Client operating portal for KSP projects, requests, approvals, billing, and deliverables.'
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
