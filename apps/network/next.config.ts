import type { NextConfig } from 'next';

const PREVIEW_SUPABASE_URL = 'https://qfnriufuahlcwbxgprmy.supabase.co';
const PREVIEW_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9cj39NCHGF-bQGy-1Fmyyg_7oEoz8kE';

// Browser-safe production binding. The publishable key is public by design and
// ships to the browser bundle. Production must not depend on stale/missing
// Vercel public env values for the canonical KSPCENTER target.
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

function readVersionedSupabaseEnv(): Record<string, string> {
  if (process.env.VERCEL_ENV === 'preview') {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIEW_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PREVIEW_SUPABASE_PUBLISHABLE_KEY;
    return {
      NEXT_PUBLIC_SUPABASE_URL: PREVIEW_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PREVIEW_SUPABASE_PUBLISHABLE_KEY
    };
  }

  if (process.env.VERCEL_ENV !== 'production') return {};

  process.env.NEXT_PUBLIC_SUPABASE_URL = KSPCENTER_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = KSPCENTER_SUPABASE_PUBLISHABLE_KEY;

  return {
    NEXT_PUBLIC_SUPABASE_URL: KSPCENTER_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KSPCENTER_SUPABASE_PUBLISHABLE_KEY
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@ksp/permissions', '@ksp/ui', '@ksp/auth', '@ksp/database', '@ksp/validation', '@ksp/observability'],
  env: readVersionedSupabaseEnv(),
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
