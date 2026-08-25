import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { OwnerList, OwnerPageHeader } from "../../components/owner-surface";
import { getClientRows } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncClientsPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getClientRows(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Client governance"
        title="Clients"
        description="Owner view of client organizations without switching into the client Portal identity model."
        aside="Portal publication and client-safe RLS remain independent. Seeing a client in INC does not mean impersonating or widening the client's own access."
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Client organizations</h2>
          <p>Company-side governance</p>
        </div>
        <OwnerList rows={rows} empty="No client organizations were returned." />
      </section>
    </IncShell>
  );
}
