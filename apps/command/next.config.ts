import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  }
];

function readVersionedProductionEnv(): Record<string, string> {
  if (process.env.VERCEL_ENV !== 'production') return {};

  const workflow = readFileSync(new URL('../../.github/workflows/setup-login.yml', import.meta.url), 'utf8');
  const readWorkflowEnv = (name: string) =>
    workflow.match(new RegExp(`^\\s*${name}:\\s*(\\S+)\\s*$`, 'm'))?.[1];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? readWorkflowEnv('NEXT_PUBLIC_SUPABASE_URL');
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    readWorkflowEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (!url || !publishableKey) {
    throw new Error('production_supabase_public_env_missing');
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_PORTAL_BASE_URL: process.env.NEXT_PUBLIC_PORTAL_BASE_URL ?? 'https://ksp-os-portal.vercel.app'
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ksp/permissions', '@ksp/ui', '@ksp/auth', '@ksp/database', '@ksp/validation'],
  env: readVersionedProductionEnv(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};

export default nextConfig;
