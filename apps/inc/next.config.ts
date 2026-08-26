import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const PREVIEW_SUPABASE_URL = "https://qfnriufuahlcwbxgprmy.supabase.co";
const PREVIEW_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_9cj39NCHGF-bQGy-1Fmyyg_7oEoz8kE";

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
  // `main` is the repository's canonical production branch. Treat a main-branch
  // deployment as production even if Vercel mislabels the deployment as Preview;
  // otherwise the public standalone INC hostname can silently authenticate
  // against the isolated staging project.
  const isProductionSource =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_GIT_COMMIT_REF === "main";

  if (!isProductionSource && process.env.VERCEL_ENV === "preview") {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIEW_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      PREVIEW_SUPABASE_PUBLISHABLE_KEY;
    return {
      NEXT_PUBLIC_SUPABASE_URL: PREVIEW_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PREVIEW_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  if (!isProductionSource) return {};

  const workflow = readFileSync(
    new URL("../../.github/workflows/setup-login.yml", import.meta.url),
    "utf8",
  );
  const readWorkflowEnv = (name: string) =>
    workflow.match(new RegExp(`^\\s*${name}:\\s*(\\S+)\\s*$`, "m"))?.[1];

  const url =
    readWorkflowEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    readWorkflowEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error("production_supabase_public_env_missing");
  }

  if (process.env.VERCEL_GIT_COMMIT_REF === "main" && url === PREVIEW_SUPABASE_URL) {
    throw new Error("main_branch_cannot_use_preview_supabase");
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
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
