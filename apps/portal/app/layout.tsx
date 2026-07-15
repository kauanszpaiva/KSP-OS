import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'KSP Client Portal',
  description: 'Invite-only client portal for KSP Dominion Group projects, requests, approvals, billing, and deliverables.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
