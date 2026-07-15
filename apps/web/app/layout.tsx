import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'KSP Dominion Command OS', description: 'Governed operating system for KSP Dominion Group.' };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
