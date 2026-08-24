'use client';

import { useActionState } from 'react';
import { Badge, useActionToast } from '@ksp/ui';
import type { ClientMediaProjectOption } from '../client-media-data';
import type { SocialClientOption, SocialContentOption, SocialControlMode, SocialDistributionView, SocialProfileView, SocialStatus } from '../social-distribution-data';
import {
  createSocialDistribution,
  createSocialProfile,
  updateSocialDistribution,
  type SocialDistributionActionResult
} from '../social-distribution-actions';

const initial: SocialDistributionActionResult = { ok: false };

const controlLabels: Record<SocialControlMode, string> = {
  controlled: 'CONTROLADO',
  shared: 'COMPARTILHADO',
  external: 'EXTERNO',
  unknown: 'A CONFIRMAR'
};

const statusLabels: Record<SocialStatus, string> = {
  planned: 'Planejado',
  creating: 'Produção',
  internal_review: 'Revisão interna',
  client_review: 'Revisão cliente',
  ready: 'Pronto',
  delivered: 'Entregue',
  awaiting_external: 'Aguardando publicação externa',
  scheduled: 'Agendado',
  published: 'Publicado',
  withdrawn: 'Retirado do ar',
  skipped: 'Não publicar'
};

function ControlBadge({ mode }: { mode: SocialControlMode }) {
  const tone = mode === 'controlled' ? 'good' : mode === 'shared' ? 'brand' : mode === 'external' ? 'warn' : 'neutral';
  return <Badge tone={tone}>{controlLabels[mode]}</Badge>;
}

function ProfileForm({ clients, projects }: { clients: SocialClientOption[]; projects: ClientMediaProjectOption[] }) {
  const [state, action, pending] = useActionState(createSocialProfile, initial);
  useActionToast(state, 'Social profile added');

  return (
    <details className="rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-semibold text-brand marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">+ Add social profile</summary>
      <form action={action} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[12px] font-medium text-ink-2">Profile name<input name="displayName" required minLength={2} placeholder="BEZ Group" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">Platform<select name="platform" defaultValue="instagram" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]"><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="linkedin">LinkedIn</option><option value="other">Other</option></select></label>
        <label className="text-[12px] font-medium text-ink-2">Handle<input name="handle" placeholder="@bezgroup" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">Client scope<select name="clientId" defaultValue="" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]"><option value="">KSP / global profile</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.displayName} · all projects</option>)}</select></label>
        <label className="text-[12px] font-medium text-ink-2">Project scope <span className="font-normal text-ink-4">(optional)</span><select name="projectId" defaultValue="" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]"><option value="">No project restriction</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.clientName} · {project.name}</option>)}</select></label>
        <label className="text-[12px] font-medium text-ink-2 sm:col-span-2">Editorial role<input name="editorialRole" placeholder="Institution/community, founder authority, podcast/cuts…" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">Publication control<select name="controlMode" defaultValue="unknown" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]"><option value="controlled">Controlled by KSP</option><option value="shared">Shared / collaboration</option><option value="external">External / client publishes</option><option value="unknown">Confirm responsibility</option></select></label>
        <label className="text-[12px] font-medium text-ink-2">Account owner<input name="accountOwner" placeholder="BEZ Group / Everton / KSP" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">Who publishes<input name="publisher" placeholder="KSP social / account owner" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">Approval owner<input name="approver" placeholder="Internal / client / owner" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">KPI owner<input name="kpiOwner" placeholder="KSP / client / shared" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        {!state.ok && state.error && <p className="text-[12px] text-risk sm:col-span-2 lg:col-span-3">{state.error}</p>}
        <div className="flex justify-end lg:col-span-4"><button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-50">{pending ? 'Saving…' : 'Save profile'}</button></div>
      </form>
    </details>
  );
}

function RouteForm({ profiles, contentItems }: { profiles: SocialProfileView[]; contentItems: SocialContentOption[] }) {
  const [state, action, pending] = useActionState(createSocialDistribution, initial);
  useActionToast(state, 'Content routed to social profile');

  return (
    <details className="rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-semibold text-brand marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">+ Route content to profile</summary>
      <form action={action} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-[12px] font-medium text-ink-2">Content<select name="contentItemId" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]"><option value="">Choose content</option>{contentItems.map((item) => <option key={item.id} value={item.id}>{item.clientName ? `${item.clientName} · ` : ''}{item.title}</option>)}</select></label>
        <label className="text-[12px] font-medium text-ink-2">Destination profile<select name="socialProfileId" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]"><option value="">Choose profile</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName} · {profile.platform} · {controlLabels[profile.controlMode]}</option>)}</select></label>
        <label className="text-[12px] font-medium text-ink-2">Control override<select name="controlMode" defaultValue="" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]"><option value="">Use profile default</option><option value="controlled">Controlled by KSP</option><option value="shared">Shared</option><option value="external">External</option><option value="unknown">Confirm responsibility</option></select></label>
        <label className="text-[12px] font-medium text-ink-2">Target publish time<input name="scheduledFor" type="datetime-local" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">Publisher override<input name="publisher" placeholder="Optional" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        <label className="text-[12px] font-medium text-ink-2">Approver override<input name="approver" placeholder="Optional" className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13px]" /></label>
        {!state.ok && state.error && <p className="text-[12px] text-risk sm:col-span-2">{state.error}</p>}
        <div className="flex justify-end lg:col-span-3"><button type="submit" disabled={pending || profiles.length === 0 || contentItems.length === 0} className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-50">{pending ? 'Routing…' : 'Create distribution lane'}</button></div>
      </form>
    </details>
  );
}

function UpdateDistribution({ distribution }: { distribution: SocialDistributionView }) {
  const [state, action, pending] = useActionState(updateSocialDistribution, initial);
  useActionToast(state, 'Distribution updated');

  return (
    <details className="mt-3 rounded-lg border border-line-2">
      <summary className="cursor-pointer list-none px-3 py-2 text-[11.5px] font-medium text-brand marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">Update state / publication evidence</summary>
      <form action={action} className="grid gap-2.5 border-t border-line p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="distributionId" value={distribution.id} />
        <label className="text-[11.5px] text-ink-2">State<select name="status" defaultValue={distribution.status} className="mt-1 w-full rounded-md border border-line-2 bg-surface px-2.5 py-2 text-[12px]">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-[11.5px] text-ink-2">Schedule / reschedule<input name="scheduledFor" type="datetime-local" className="mt-1 w-full rounded-md border border-line-2 bg-surface px-2.5 py-2 text-[12px]" /></label>
        <label className="text-[11.5px] text-ink-2">Evidence<select name="evidenceKind" defaultValue={distribution.evidenceKind} className="mt-1 w-full rounded-md border border-line-2 bg-surface px-2.5 py-2 text-[12px]"><option value="none">None yet</option><option value="publication_url">Publication URL</option><option value="owner_confirmation">Owner confirmation</option><option value="platform_api">Platform confirmation</option><option value="manual">Manual verification</option></select></label>
        <label className="text-[11.5px] text-ink-2">Published URL<input name="publicationUrl" type="url" defaultValue={distribution.publicationUrl ?? ''} placeholder="https://…" className="mt-1 w-full rounded-md border border-line-2 bg-surface px-2.5 py-2 text-[12px]" /></label>
        <label className="text-[11.5px] text-ink-2">Evidence note<input name="evidenceNote" defaultValue={distribution.evidenceNote ?? ''} placeholder="Who confirmed / API reference" className="mt-1 w-full rounded-md border border-line-2 bg-surface px-2.5 py-2 text-[12px]" /></label>
        {!state.ok && state.error && <p className="text-[11.5px] text-risk lg:col-span-4">{state.error}</p>}
        <div className="flex justify-end lg:col-span-5"><button type="submit" disabled={pending} className="rounded-md bg-brand px-3 py-2 text-[12px] font-semibold text-on-brand disabled:opacity-50">{pending ? 'Saving…' : 'Save state'}</button></div>
      </form>
    </details>
  );
}

function DistributionRow({ distribution }: { distribution: SocialDistributionView }) {
  const statusTone = distribution.status === 'published' ? 'good' : distribution.status === 'awaiting_external' ? 'warn' : distribution.status === 'withdrawn' ? 'risk' : 'neutral';

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="text-[13.5px] font-semibold text-ink">{distribution.contentTitle}</p><Badge tone={statusTone}>{statusLabels[distribution.status]}</Badge><ControlBadge mode={distribution.controlMode} /></div>
          <p className="mt-1 text-[12px] text-ink-3">→ {distribution.profileName} · {distribution.platform}{distribution.handle ? ` · ${distribution.handle}` : ''}{distribution.clientName ? ` · ${distribution.clientName}` : ''}{distribution.projectName ? ` · ${distribution.projectName}` : ''}</p>
          <p className="mt-1 text-[11.5px] text-ink-4">Publisher: {distribution.publisher ?? 'unassigned'} · Approver: {distribution.approver ?? 'unassigned'} · Asset: {distribution.assetReady ? distribution.assetName ?? 'ready version linked' : 'not linked to a ready media version'}</p>
          {distribution.scheduledFor && <p className="mt-1 text-[11.5px] text-ink-4">Target: {new Date(distribution.scheduledFor).toLocaleString()}</p>}
          {distribution.publishedAt && <p className="mt-1 text-[11.5px] text-ink-4">Publication confirmed: {new Date(distribution.publishedAt).toLocaleString()} · evidence: {distribution.evidenceKind}</p>}
        </div>
        {distribution.publicationUrl && <a href={distribution.publicationUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-medium text-brand hover:bg-brand-tint">Open published post ↗</a>}
      </div>
      <UpdateDistribution distribution={distribution} />
    </div>
  );
}

function QueueSection({ title, description, items, empty }: { title: string; description: string; items: SocialDistributionView[]; empty: string }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="px-4 py-3 sm:px-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">{title}</p><p className="mt-0.5 text-[11.5px] text-muted">{description}</p></div><Badge tone="neutral">{items.length}</Badge></div></div>
      <div className="divide-y divide-line">{items.length === 0 ? <div className="px-5 py-5 text-[12px] text-muted">{empty}</div> : items.map((distribution) => <DistributionRow key={distribution.id} distribution={distribution} />)}</div>
    </div>
  );
}

export function SocialDistributionWorkspace({ clients, profiles, contentItems, distributions, projects }: { clients: SocialClientOption[]; profiles: SocialProfileView[]; contentItems: SocialContentOption[]; distributions: SocialDistributionView[]; projects: ClientMediaProjectOption[] }) {
  const active = distributions.filter((item) => !['published', 'withdrawn', 'skipped'].includes(item.status));
  const controlledQueue = active.filter((item) => ['controlled', 'shared'].includes(item.controlMode));
  const externalWatch = active.filter((item) => ['external', 'unknown'].includes(item.controlMode));
  const history = distributions.filter((item) => ['published', 'withdrawn', 'skipped'].includes(item.status));
  const published = distributions.filter((item) => item.status === 'published').length;

  return (
    <section className="mb-8 rounded-xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">KSP Agency · Social distribution control</p>
            <h2 className="mt-1 text-[16px] font-semibold text-ink">One content source, separate publication responsibility per profile</h2>
            <p className="mt-1 max-w-3xl text-[12.5px] leading-5 text-muted">Profiles can be KSP-global, client-wide, or project-specific. Defaults define the normal owner, publisher, approver and KPI owner; each content item can override those defaults. Client delivery, Portal visibility and social publication remain independent states.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Badge tone="good">{controlledQueue.length} KSP/shared open</Badge><Badge tone="warn">{externalWatch.length} external/confirm</Badge><Badge tone="brand">{published} published with evidence</Badge></div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-line p-4 sm:p-5 lg:grid-cols-2"><ProfileForm clients={clients} projects={projects} /><RouteForm profiles={profiles} contentItems={contentItems} /></div>

      <div className="border-b border-line px-4 py-3 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">Profile responsibility matrix</p>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {profiles.length === 0 ? <p className="text-[12px] text-muted">No social profiles configured yet.</p> : profiles.map((profile) => (
            <div key={profile.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-line-2 px-3 py-2.5">
              <div className="min-w-0"><p className="text-[12.5px] font-semibold text-ink">{profile.displayName} <span className="font-normal text-ink-4">· {profile.platform}{profile.handle ? ` · ${profile.handle}` : ''}</span></p>{profile.editorialRole && <p className="mt-0.5 text-[11.5px] text-ink-3">{profile.editorialRole}</p>}<p className="mt-0.5 text-[11px] text-ink-4">{profile.clientName ? `${profile.clientName}${profile.projectName ? ` · ${profile.projectName}` : ' · all projects'}` : 'KSP / global'} · owner: {profile.accountOwner ?? 'not assigned'} · publishes: {profile.publisher ?? 'not assigned'} · approves: {profile.approver ?? 'not assigned'} · KPI: {profile.kpiOwner ?? 'not assigned'}</p></div>
              <ControlBadge mode={profile.controlMode} />
            </div>
          ))}
        </div>
      </div>

      <QueueSection title="Controlled publishing queue" description="KSP-controlled or shared lanes that the operating team can move through ready → scheduled → published." items={controlledQueue} empty="No open controlled/shared social distribution lanes." />
      <QueueSection title="External publication watchlist" description="KSP can produce and deliver these, but publication stays pending until the external owner or evidence confirms it." items={externalWatch} empty="No external or unconfirmed publication lanes waiting on another owner." />
      <QueueSection title="Publication history" description="Evidence-backed published items, withdrawn posts and intentionally skipped distribution lanes." items={history} empty="No completed publication history yet." />
    </section>
  );
}
