import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LegacyNetworkRoute() {
  const networkUrl = process.env.NEXT_PUBLIC_KSP_NETWORK_URL?.trim();
  if (networkUrl) redirect(networkUrl);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
      <div className="max-w-md rounded-xl border border-line bg-surface p-7 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">KSP Network</p>
        <h1 className="mt-2 text-xl font-semibold">Network moved to its own app</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          KSP Network is no longer hosted inside the Client Portal. Configure NEXT_PUBLIC_KSP_NETWORK_URL on the Portal deployment to keep this legacy route as a redirect.
        </p>
      </div>
    </main>
  );
}
