import { SignOutButton } from "../../components/sign-out-button";

export default function NoAccessPage() {
  return (
    <main className="authShell">
      <section className="authCard">
        <div className="eyebrow">Access denied</div>
        <h1>KSP INC is owner-only.</h1>
        <p>
          Your session is valid, but it does not resolve to a global KSP INC
          owner role. No owner data is shown.
        </p>
        <div className="notice">
          Command, Portal and Network keep their own scoped access rules. KSP
          INC is not a shortcut around them.
        </div>
        <div style={{ marginTop: 18 }}>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
