"use client";

import { useState } from "react";
import { getBrowserSupabase } from "../lib/supabase-browser";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="textButton"
      disabled={busy}
      onClick={async () => {
        const supabase = getBrowserSupabase();
        if (!supabase) return;
        setBusy(true);
        await supabase.auth.signOut();
        window.location.assign("/login");
      }}
      type="button"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
