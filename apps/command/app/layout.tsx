import './globals.css';
import type { ReactNode } from 'react';
import { ThemeProvider, themeInitScript } from '@ksp/ui';

export const metadata = {
  title: 'KSP Dominion Command OS',
  description: 'Governed operating system for KSP Dominion Group.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
