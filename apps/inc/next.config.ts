import type { NextConfig } from "next";

const PREVIEW_SUPABASE_URL = "https://qfnriufuahlcwbxgprmy.supabase.co";
const PREVIEW_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_9cj39NCHGF-bQGy-1Fmyyg_7oEoz8kE";

// Browser-safe production binding. The publishable key is intentionally public
// and ships to the browser bundle. KSP INC must resolve the same canonical
// KSPCENTER identity/data plane as Command, Portal, and Network.
const KSPCENTER_SUPABASE_URL = "https://rmaxqwbjizivkhurvuvx.supabase.co";
const KSPCENTER_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_-0aveLl4f5ZbtooQWa_lRg_E3MG4eEB";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

function readVersionedSupabaseEnv(): Record<string, string> {
  // main is the canonical production source. Treat it as production even if a
  // provider temporarily labels the deployment as Preview, so the public INC
  // hostname can never silently authenticate against the isolated test project.
  const isProductionSource =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_GIT_COMMIT_REF === "main";

  if (!isProductionSource && process.env.VERCEL_ENV === "preview") {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIEW_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      PREVIEW_SUPABASE_PUBLISHABLE_KEY;
    return {
      NEXT_PUBLIC_SUPABASE_URL: PREVIEW_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        PREVIEW_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  if (!isProductionSource) return {};

  process.env.NEXT_PUBLIC_SUPABASE_URL = KSPCENTER_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    KSPCENTER_SUPABASE_PUBLISHABLE_KEY;

  return {
    NEXT_PUBLIC_SUPABASE_URL: KSPCENTER_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      KSPCENTER_SUPABASE_PUBLISHABLE_KEY,
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "@ksp/auth",
    "@ksp/database",
    "@ksp/permissions",
    "@ksp/observability",
  ],
  env: readVersionedSupabaseEnv(),
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["async_hooks"],
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
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
