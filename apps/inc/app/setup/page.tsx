export default function SetupPage() {
  return (
    <main className="authShell">
      <section className="authCard">
        <div className="eyebrow">Environment gate</div>
        <h1>KSP INC is not configured here.</h1>
        <p>The standalone owner plane requires the shared public Supabase URL and publishable key. No fallback identity or bypass is enabled.</p>
        <div className="notice">This state is intentionally fail-closed. Configure the approved environment mapping before enabling a preview or production deployment.</div>
      </section>
    </main>
  );
}
