import type { NextConfig } from 'next';
import { assertCanonicalProductionSupabaseUrl } from './lib/production-supabase-target';

const PREVIEW_SUPABASE_URL = 'https://qfnriufuahlcwbxgprmy.supabase.co';
const PREVIEW_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9cj39NCHGF-bQGy-1Fmyyg_7oEoz8kE';

// Browser-safe production binding. These values are intentionally versioned:
// the publishable key is public by design and is shipped to the browser bundle.
// Production must not inherit a stale Supabase public target from Vercel.
const KSPCENTER_SUPABASE_URL = 'https://rmaxqwbjizivkhurvuvx.supabase.co';
const KSPCENTER_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-0aveLl4f5ZbtooQWa_lRg_E3MG4eEB';

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

function readVersionedPublicEnv(): Record<string, string> {
  if (process.env.VERCEL_ENV === 'preview') {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIEW_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PREVIEW_SUPABASE_PUBLISHABLE_KEY;
    return {
      NEXT_PUBLIC_SUPABASE_URL: PREVIEW_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PREVIEW_SUPABASE_PUBLISHABLE_KEY
    };
  }

  if (process.env.VERCEL_ENV !== 'production') return {};

  const canonicalUrl = assertCanonicalProductionSupabaseUrl(KSPCENTER_SUPABASE_URL);
  process.env.NEXT_PUBLIC_SUPABASE_URL = canonicalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = KSPCENTER_SUPABASE_PUBLISHABLE_KEY;

  const portalBaseUrl = process.env.NEXT_PUBLIC_PORTAL_BASE_URL?.trim() || 'https://kspdominionportal.com';

  return {
    NEXT_PUBLIC_SUPABASE_URL: canonicalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KSPCENTER_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_PORTAL_BASE_URL: portalBaseUrl,
    NEXT_PUBLIC_COMMAND_BASE_URL: process.env.NEXT_PUBLIC_COMMAND_BASE_URL ?? 'https://www.appkspdominion.com'
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ksp/permissions', '@ksp/ui', '@ksp/auth', '@ksp/database', '@ksp/validation', '@ksp/observability'],
  env: readVersionedPublicEnv(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['async_hooks'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
      };
    }
    return config;
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};

export default nextConfig;
