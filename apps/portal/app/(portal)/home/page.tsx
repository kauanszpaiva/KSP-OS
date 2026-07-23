import { Reveal } from '@ksp/ui';
import { requirePortalSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';

const ROLE_LABELS: Record<string, string> = {
  client_owner: 'Owner',
  client_project_approver: 'Project approver',
  client_billing_contact: 'Billing contact',
  client_collaborator: 'Collaborator',
  client_viewer: 'Viewer'
};

/**
 * Placeholder home — proves the shell/auth/theme stack works end to end.
 * Phase P1 (Home + Projects) replaces this with the real dashboard: project
 * summary, "what KSP needs from you", upcoming dates, recent deliveries,
 * invoice/payment status.
 */
export default async function PortalHomePage() {
  const ctx = await requirePortalSession();
  const supabase = await getServerSupabase();

  const clientOrgIds = ctx.memberships.map((m) => m.clientOrganizationId);
  const { data: orgs } = supabase && clientOrgIds.length
    ? await supabase.from('client_organizations').select('id, display_name').in('id', clientOrgIds)
    : { data: [] as Array<{ id: string; display_name: string }> };
  const nameById = new Map((orgs ?? []).map((o) => [o.id, o.display_name]));

  return (
    <div>
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Home</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">Welcome back, {ctx.user.displayName}</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          You have access to {ctx.memberships.length} client workspace{ctx.memberships.length === 1 ? '' : 's'}.
        </p>
      </Reveal>

      <Reveal delay={60} className="mt-7 overflow-hidden rounded-xl border border-line bg-surface">
        {ctx.memberships.map((m, i) => (
          <div key={`${m.clientOrganizationId}-${m.role}`} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
            <span className="text-[14px] font-medium text-ink">{nameById.get(m.clientOrganizationId) ?? 'Client workspace'}</span>
            <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-medium text-brand">{ROLE_LABELS[m.role] ?? m.role}</span>
          </div>
        ))}
      </Reveal>

      <p className="mt-6 text-[13px] text-ink-3">
        Project summaries, approvals, files, and invoices arrive in the next Portal phases.
      </p>
    </div>
  );
}
