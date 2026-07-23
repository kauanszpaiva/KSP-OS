import './globals.css';
import type { ReactNode } from 'react';
import { ThemeProvider, themeInitScript } from '@ksp/ui';

export const metadata = {
  title: 'KSP Client Portal',
  description: 'Invite-only client portal for KSP Dominion Group projects, requests, approvals, billing, and deliverables.',
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
