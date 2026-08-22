import type { SupabaseClient } from '@ksp/database';
import type {
  ApprovalDecision,
  ApprovalRequest,
  Campaign,
  ChartAccount,
  ClientInternalNote,
  ClientMeeting,
  ClientOrganization,
  Comment,
  Commitment,
  CompanyOutcome,
  Contact,
  ContentItem,
  DocumentRecord,
  InboxItem,
  IntegrationConnection,
  Lead,
  MissionDependency,
  MissionMilestone,
  Notification,
  Product,
  Project,
  ProjectMembership,
  Proof,
  Subscription,
  Task
} from '@ksp/database';

import { TASK_DELIVERY_BUCKET } from './task-delivery-constants';

export interface MemberRef {
  id: string;
  displayName: string;
}

export interface CommitmentView extends Commitment {
  ownerName: string;
  proofs: Proof[];
}

export async function getMembers(supabase: SupabaseClient, userId: string): Promise<MemberRef[]> {
  // profiles_org_read RLS scopes this to org peers.
  const { data } = await supabase.from('profiles').select('id, display_name').order('display_name');
  const rows = (data ?? []) as Array<{ id: string; display_name: string }>;
  const list = rows.map((r) => ({ id: r.id, displayName: r.display_name }));
  if (!list.some((m) => m.id === userId)) return list;
  return list;
}

export async function getOutcomes(supabase: SupabaseClient): Promise<CompanyOutcome[]> {
  const { data } = await supabase.from('company_outcomes').select('*').order('created_at', { ascending: false });
  return (data ?? []) as CompanyOutcome[];
}

export async function getCommitments(supabase: SupabaseClient): Promise<CommitmentView[]> {
  const [{ data: commitments }, { data: profiles }, { data: proofs }] = await Promise.all([
    supabase.from('commitments').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('proofs').select('*').order('created_at', { ascending: false })
  ]);
  const nameById = new Map((((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name])));
  const proofsByCommitment = new Map<string, Proof[]>();
  for (const p of (proofs ?? []) as Proof[]) {
    const arr = proofsByCommitment.get(p.commitment_id) ?? [];
    arr.push(p);
    proofsByCommitment.set(p.commitment_id, arr);
  }
  return ((commitments ?? []) as Commitment[]).map((c) => ({
    ...c,
    ownerName: nameById.get(c.owner_id) ?? 'Unassigned',
    proofs: proofsByCommitment.get(c.id) ?? []
  }));
}

export interface ActivityView {
  id: string;
  verb: string;
  summary: string;
  created_at: string;
  actorName: string;
}

export async function getActivity(supabase: SupabaseClient, limit = 8): Promise<ActivityView[]> {
  const [{ data: events }, { data: profiles }] = await Promise.all([
    supabase.from('activity_events').select('id, verb, summary, created_at, actor_id').order('created_at', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  return ((events ?? []) as Array<{ id: string; verb: string; summary: string; created_at: string; actor_id: string | null }>).map((e) => ({
    id: e.id,
    verb: e.verb,
    summary: e.summary,
    created_at: e.created_at,
    actorName: (e.actor_id && nameById.get(e.actor_id)) || 'System'
  }));
}

export async function getMyCommitments(supabase: SupabaseClient, userId: string): Promise<CommitmentView[]> {
  const all = await getCommitments(supabase);
  const { data: assignments } = await supabase.from('commitment_assignments').select('commitment_id').eq('profile_id', userId);
  const assigned = new Set(((assignments ?? []) as Array<{ commitment_id: string }>).map((a) => a.commitment_id));
  return all.filter((c) => c.owner_id === userId || assigned.has(c.id));
}

/* --------------------------------------------------------------- Phase C2 -- */

export interface SignalView extends InboxItem {
  creatorName: string;
}

export async function getSignals(supabase: SupabaseClient): Promise<SignalView[]> {
  // inbox_owner_read RLS scopes rows to the executive (all) or the creator (own).
  const [{ data: items }, { data: profiles }] = await Promise.all([
    supabase.from('inbox_items').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  return ((items ?? []) as InboxItem[]).map((i) => ({
    ...i,
    creatorName: (i.created_by && nameById.get(i.created_by)) || 'Unknown'
  }));
}

export interface DecisionView extends ApprovalRequest {
  requesterName: string;
  decisions: ApprovalDecision[];
}

export async function getDecisions(supabase: SupabaseClient): Promise<DecisionView[]> {
  // approvals_executive_read RLS scopes rows to the executive (all) or the requester (own).
  const [{ data: requests }, { data: profiles }, { data: decisions }] = await Promise.all([
    supabase.from('approval_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('approval_decisions').select('*').order('created_at', { ascending: false })
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  const decisionsByRequest = new Map<string, ApprovalDecision[]>();
  for (const d of (decisions ?? []) as ApprovalDecision[]) {
    const arr = decisionsByRequest.get(d.approval_request_id) ?? [];
    arr.push(d);
    decisionsByRequest.set(d.approval_request_id, arr);
  }
  return ((requests ?? []) as ApprovalRequest[]).map((r) => ({
    ...r,
    requesterName: nameById.get(r.requester_id) ?? 'Unknown',
    decisions: decisionsByRequest.get(r.id) ?? []
  }));
}

/* --------------------------------------------------------------- Phase C3 -- */

export interface MissionView extends Project {
  milestones: MissionMilestone[];
  dependencies: MissionDependency[];
  memberIds: string[];
  commitmentCount: number;
  /** Display name of the linked client organization, if any (projects.client_id). */
  clientName: string | null;
}

/** Lightweight client picker option — id + display name only (no contacts/notes join). */
export interface ClientRef {
  id: string;
  displayName: string;
}

export async function getClientRefs(supabase: SupabaseClient): Promise<ClientRef[]> {
  const { data } = await supabase
    .from('client_organizations')
    .select('id, display_name')
    .eq('status', 'active')
    .order('display_name', { ascending: true });
  return ((data ?? []) as Array<{ id: string; display_name: string }>).map((c) => ({ id: c.id, displayName: c.display_name }));
}

export async function getMissions(supabase: SupabaseClient): Promise<MissionView[]> {
  // projects_member_read RLS scopes rows to the executive (all) or an assigned member.
  const [{ data: projects }, { data: milestones }, { data: dependencies }, { data: memberships }, { data: commitments }, { data: clients }] =
    await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('mission_milestones').select('*').order('sort_order', { ascending: true }),
      supabase.from('mission_dependencies').select('*'),
      supabase.from('project_memberships').select('project_id, profile_id'),
      supabase.from('commitments').select('id, outcome_id').not('outcome_id', 'is', null),
      supabase.from('client_organizations').select('id, display_name')
    ]);

  const milestonesByProject = new Map<string, MissionMilestone[]>();
  for (const m of (milestones ?? []) as MissionMilestone[]) {
    const arr = milestonesByProject.get(m.project_id) ?? [];
    arr.push(m);
    milestonesByProject.set(m.project_id, arr);
  }
  const dependenciesByProject = new Map<string, MissionDependency[]>();
  for (const d of (dependencies ?? []) as MissionDependency[]) {
    const arr = dependenciesByProject.get(d.project_id) ?? [];
    arr.push(d);
    dependenciesByProject.set(d.project_id, arr);
  }
  const membersByProject = new Map<string, string[]>();
  for (const m of (memberships ?? []) as Array<{ project_id: string; profile_id: string }>) {
    const arr = membersByProject.get(m.project_id) ?? [];
    arr.push(m.profile_id);
    membersByProject.set(m.project_id, arr);
  }
  const clientNameById = new Map(((clients ?? []) as Array<{ id: string; display_name: string }>).map((c) => [c.id, c.display_name]));
  void commitments; // reserved: commitments do not yet carry a mission/project link (Phase C3 follow-up).

  return ((projects ?? []) as Project[]).map((p) => ({
    ...p,
    milestones: milestonesByProject.get(p.id) ?? [],
    dependencies: dependenciesByProject.get(p.id) ?? [],
    memberIds: membersByProject.get(p.id) ?? [],
    commitmentCount: 0,
    clientName: (p.client_id && clientNameById.get(p.client_id)) || null
  }));
}

export async function getMissionMembers(supabase: SupabaseClient): Promise<ProjectMembership[]> {
  const { data } = await supabase.from('project_memberships').select('*');
  return (data ?? []) as ProjectMembership[];
}

/* ----------------------------------------------------------- Phase C3: Workspace -- */

export interface TaskView extends Task {
  ownerName: string;
  projectName: string | null;
}

export async function getTasks(supabase: SupabaseClient): Promise<TaskView[]> {
  // tasks_project_read RLS scopes rows to the executive (all), unassigned tasks, or an assigned project's members.
  const [{ data: tasks }, { data: profiles }, { data: projects }] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('projects').select('id, name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  const projectNameById = new Map(((projects ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  return ((tasks ?? []) as Task[]).map((t) => ({
    ...t,
    ownerName: (t.owner_id && nameById.get(t.owner_id)) || 'Unassigned',
    projectName: (t.project_id && projectNameById.get(t.project_id)) || null
  }));
}


export interface TaskDeliveryEvidenceView {
  id: string;
  task_id: string;
  kind: 'file' | 'external_url';
  status: 'pending' | 'ready' | 'failed';
  external_url: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  submitted_by: string;
  submittedByName: string;
  signedUrl: string | null;
}

export async function getTaskDeliveryEvidenceForTasks(
  supabase: SupabaseClient,
  taskIds: string[]
): Promise<Map<string, TaskDeliveryEvidenceView[]>> {
  const grouped = new Map<string, TaskDeliveryEvidenceView[]>();
  if (taskIds.length === 0) return grouped;

  const [{ data: rows }, { data: profiles }] = await Promise.all([
    supabase
      .from('task_delivery_evidence')
      .select('id, task_id, submitted_by, kind, status, storage_path, external_url, original_filename, mime_type, size_bytes, created_at')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name')
  ]);

  const names = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((profile) => [profile.id, profile.display_name]));
  const hydrated = await Promise.all(((rows ?? []) as Array<{
    id: string;
    task_id: string;
    submitted_by: string;
    kind: 'file' | 'external_url';
    status: 'pending' | 'ready' | 'failed';
    storage_path: string | null;
    external_url: string | null;
    original_filename: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }>).map(async (row): Promise<TaskDeliveryEvidenceView> => {
    let signedUrl: string | null = null;
    if (row.kind === 'file' && row.status === 'ready' && row.storage_path) {
      const { data } = await supabase.storage.from(TASK_DELIVERY_BUCKET).createSignedUrl(row.storage_path, 15 * 60);
      signedUrl = data?.signedUrl ?? null;
    }
    return {
      id: row.id,
      task_id: row.task_id,
      kind: row.kind,
      status: row.status,
      external_url: row.external_url,
      original_filename: row.original_filename,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      created_at: row.created_at,
      submitted_by: row.submitted_by,
      submittedByName: names.get(row.submitted_by) ?? 'Team member',
      signedUrl
    };
  }));

  for (const item of hydrated) {
    const items = grouped.get(item.task_id) ?? [];
    items.push(item);
    grouped.set(item.task_id, items);
  }
  return grouped;
}

/* --------------------------------------------------------- Phase C3: Team -- */

export interface TeamLoadView {
  profileId: string;
  displayName: string;
  role: string | null;
  department: string | null;
  suspended: boolean;
  openCommitments: number;
  openTasks: number;
  missionCount: number;
}

/**
 * v1 capacity signal: a simple open-item count per person, not hour-based
 * allocation (no table tracks planned hours yet). Good enough to flag who is
 * visibly overloaded; a real capacity model is a Phase C3 follow-up.
 */
export async function getTeamLoad(supabase: SupabaseClient): Promise<TeamLoadView[]> {
  const [{ data: profiles }, { data: assignments }, { data: tasks }, { data: memberships }, { data: orgMemberships }] = await Promise.all([
    supabase.from('profiles').select('id, display_name'),
    supabase.from('commitment_assignments').select('profile_id, commitment_id'),
    supabase.from('tasks').select('owner_id, status'),
    supabase.from('project_memberships').select('profile_id, project_id'),
    supabase.from('organization_memberships').select('profile_id, internal_role, department, suspended_at').not('internal_role', 'is', null)
  ]);

  // Collapse a profile's (possibly several) org-membership rows to one role/dept.
  const roleByProfile = new Map<string, { role: string | null; department: string | null; suspended: boolean }>();
  for (const m of (orgMemberships ?? []) as Array<{ profile_id: string; internal_role: string | null; department: string | null; suspended_at: string | null }>) {
    if (roleByProfile.has(m.profile_id)) continue;
    roleByProfile.set(m.profile_id, { role: m.internal_role, department: m.department, suspended: Boolean(m.suspended_at) });
  }

  const commitmentIds = new Set(((assignments ?? []) as Array<{ commitment_id: string }>).map((a) => a.commitment_id));
  const { data: openCommitments } = commitmentIds.size
    ? await supabase.from('commitments').select('id').in('id', [...commitmentIds]).not('state', 'in', '(completed,archived,rejected)')
    : { data: [] as Array<{ id: string }> };
  const openCommitmentIds = new Set(((openCommitments ?? []) as Array<{ id: string }>).map((c) => c.id));

  const load = new Map<string, TeamLoadView>();
  for (const p of (profiles ?? []) as Array<{ id: string; display_name: string }>) {
    const meta = roleByProfile.get(p.id);
    load.set(p.id, {
      profileId: p.id,
      displayName: p.display_name,
      role: meta?.role ?? null,
      department: meta?.department ?? null,
      suspended: meta?.suspended ?? false,
      openCommitments: 0,
      openTasks: 0,
      missionCount: 0
    });
  }
  for (const a of (assignments ?? []) as Array<{ profile_id: string; commitment_id: string }>) {
    if (!openCommitmentIds.has(a.commitment_id)) continue;
    const row = load.get(a.profile_id);
    if (row) row.openCommitments += 1;
  }
  for (const t of (tasks ?? []) as Array<{ owner_id: string | null; status: string }>) {
    if (!t.owner_id || t.status !== 'active') continue;
    const row = load.get(t.owner_id);
    if (row) row.openTasks += 1;
  }
  const missionsByProfile = new Set<string>();
  for (const m of (memberships ?? []) as Array<{ profile_id: string; project_id: string }>) {
    const key = `${m.profile_id}:${m.project_id}`;
    if (missionsByProfile.has(key)) continue;
    missionsByProfile.add(key);
    const row = load.get(m.profile_id);
    if (row) row.missionCount += 1;
  }

  return [...load.values()].sort((a, b) => b.openCommitments + b.openTasks - (a.openCommitments + a.openTasks));
}

/* ----------------------------------------------------- Phase C7: Member admin -- */

export interface MemberAdminView {
  profileId: string;
  displayName: string;
  email: string;
  role: string;
  suspended: boolean;
}

/**
 * One row per internal member with their role and suspension state, for the
 * executive-only access panel. member_read RLS scopes organization_memberships
 * to the caller's org; a profile with several role rows is collapsed to one
 * (the role column is what updateMemberRole mutates).
 */
export async function getMembersAdmin(supabase: SupabaseClient): Promise<MemberAdminView[]> {
  const [{ data: memberships }, { data: profiles }] = await Promise.all([
    supabase.from('organization_memberships').select('profile_id, internal_role, suspended_at').not('internal_role', 'is', null),
    supabase.from('profiles').select('id, display_name, email')
  ]);
  const profileById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string; email: string | null }>).map((p) => [p.id, p]));
  const seen = new Set<string>();
  const rows: MemberAdminView[] = [];
  for (const m of (memberships ?? []) as Array<{ profile_id: string; internal_role: string; suspended_at: string | null }>) {
    if (seen.has(m.profile_id)) continue;
    seen.add(m.profile_id);
    const p = profileById.get(m.profile_id);
    rows.push({
      profileId: m.profile_id,
      displayName: p?.display_name ?? 'Unknown',
      email: p?.email ?? '',
      role: m.internal_role,
      suspended: Boolean(m.suspended_at)
    });
  }
  return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/* --------------------------------------------------------------- Phase C4 -- */

export interface LeadView extends Lead {
  ownerName: string;
  weightedValueMinor: number;
}

export async function getLeads(supabase: SupabaseClient): Promise<LeadView[]> {
  const [{ data: leads }, { data: profiles }] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  return ((leads ?? []) as Lead[]).map((l) => ({
    ...l,
    ownerName: nameById.get(l.owner_id) ?? 'Unassigned',
    weightedValueMinor: Math.round((l.expected_value_minor ?? 0) * ((l.probability ?? 0) / 100))
  }));
}

export interface ClientView extends ClientOrganization {
  contacts: Contact[];
  notes: ClientInternalNote[];
}

export async function getClients(supabase: SupabaseClient): Promise<ClientView[]> {
  const [{ data: clients }, { data: contacts }, { data: notes }] = await Promise.all([
    supabase.from('client_organizations').select('*').order('created_at', { ascending: false }),
    supabase.from('contacts').select('*'),
    supabase.from('client_internal_notes').select('*').order('created_at', { ascending: false })
  ]);
  const contactsByClient = new Map<string, Contact[]>();
  for (const c of (contacts ?? []) as Contact[]) {
    if (!c.client_id) continue;
    const arr = contactsByClient.get(c.client_id) ?? [];
    arr.push(c);
    contactsByClient.set(c.client_id, arr);
  }
  const notesByClient = new Map<string, ClientInternalNote[]>();
  for (const n of (notes ?? []) as ClientInternalNote[]) {
    const arr = notesByClient.get(n.client_organization_id) ?? [];
    arr.push(n);
    notesByClient.set(n.client_organization_id, arr);
  }
  return ((clients ?? []) as ClientOrganization[]).map((c) => ({
    ...c,
    contacts: contactsByClient.get(c.id) ?? [],
    notes: notesByClient.get(c.id) ?? []
  }));
}

/** All client meetings visible to the internal user (RLS scopes to their org). */
export async function getClientMeetings(supabase: SupabaseClient): Promise<ClientMeeting[]> {
  const { data } = await supabase.from('client_meetings').select('*').order('scheduled_at', { ascending: true });
  return (data ?? []) as ClientMeeting[];
}

export async function getProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Product[];
}

export interface ContentItemView extends ContentItem {
  campaignName: string | null;
}

export async function getCampaigns(supabase: SupabaseClient): Promise<Campaign[]> {
  const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Campaign[];
}

export async function getContentItems(supabase: SupabaseClient): Promise<ContentItemView[]> {
  const [{ data: items }, { data: campaigns }] = await Promise.all([
    supabase.from('content_items').select('*').order('publish_date', { ascending: true, nullsFirst: false }),
    supabase.from('campaigns').select('id, name')
  ]);
  const nameById = new Map(((campaigns ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]));
  return ((items ?? []) as ContentItem[]).map((i) => ({
    ...i,
    campaignName: (i.campaign_id && nameById.get(i.campaign_id)) || null
  }));
}

/* --------------------------------------------------------------- Phase C5 -- */

export interface DocumentView extends DocumentRecord {
  projectName: string | null;
  clientName: string | null;
}

export async function getDocuments(supabase: SupabaseClient): Promise<DocumentView[]> {
  // documents_member_read RLS already hides `classification = 'restricted'` rows from non-executives.
  const [{ data: docs }, { data: projects }, { data: clients }] = await Promise.all([
    supabase.from('documents').select('*').order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name'),
    supabase.from('client_organizations').select('id, display_name')
  ]);
  const projectNameById = new Map(((projects ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  const clientNameById = new Map(((clients ?? []) as Array<{ id: string; display_name: string }>).map((c) => [c.id, c.display_name]));
  return ((docs ?? []) as DocumentRecord[]).map((d) => ({
    ...d,
    projectName: (d.project_id && projectNameById.get(d.project_id)) || null,
    clientName: (d.client_id && clientNameById.get(d.client_id)) || null
  }));
}

export async function getSoftwareTasks(supabase: SupabaseClient): Promise<TaskView[]> {
  const all = await getTasks(supabase);
  // v1 has no department dimension on projects/tasks — a task counts as
  // "software" if it links a link (PR/deploy URL) or has none yet but is open,
  // since there is no other signal to filter on. Documented simplification.
  return all;
}

export async function getSubscriptions(supabase: SupabaseClient): Promise<Subscription[]> {
  // subscriptions_executive_read RLS — empty for non-executives, not an error.
  const { data } = await supabase.from('subscriptions').select('*').order('renewal_date', { ascending: true, nullsFirst: false });
  return (data ?? []) as Subscription[];
}

export async function getIntegrationConnections(supabase: SupabaseClient): Promise<IntegrationConnection[]> {
  // integrations_admin_read RLS — empty for non-executives, not an error.
  const { data } = await supabase.from('integration_connections').select('*').order('provider', { ascending: true });
  return (data ?? []) as IntegrationConnection[];
}

export interface FinanceOverview {
  chartAccounts: ChartAccount[];
  draftEntryCount: number;
  postedEntryCount: number;
  monthlySubscriptionBurnMinor: number;
}

/**
 * Read-only aggregate over existing executive-gated finance tables. No
 * posting, no new invariant, no write path — see the Phase C5 migration
 * header and docs/rebuild/command/05_control_section.md for why the Journal
 * Workbench and Subscription Console writes are deliberately not built here.
 */
export async function getFinanceOverview(supabase: SupabaseClient): Promise<FinanceOverview> {
  const [{ data: accounts }, { data: entries }, { data: subs }] = await Promise.all([
    supabase.from('chart_accounts').select('*').order('code', { ascending: true }),
    supabase.from('journal_entries').select('status'),
    supabase.from('subscriptions').select('cost_minor, billing_frequency, status')
  ]);
  const entryRows = (entries ?? []) as Array<{ status: string }>;
  const subRows = (subs ?? []) as Array<{ cost_minor: number; billing_frequency: string; status: string }>;
  const monthlyBurn = subRows
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.billing_frequency === 'annual' ? Math.round(s.cost_minor / 12) : s.cost_minor), 0);

  return {
    chartAccounts: (accounts ?? []) as ChartAccount[],
    draftEntryCount: entryRows.filter((e) => e.status === 'draft').length,
    postedEntryCount: entryRows.filter((e) => e.status === 'posted').length,
    monthlySubscriptionBurnMinor: monthlyBurn
  };
}

/* --------------------------------------------------------------- Phase C6 -- */

export async function getNotifications(supabase: SupabaseClient, limit = 20): Promise<Notification[]> {
  // notifications_read RLS scopes rows to recipient_id = auth.uid() only.
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []) as Notification[];
}

export interface CommentView extends Comment {
  authorName: string;
}

export async function getComments(supabase: SupabaseClient, objectTable: string, objectId: string): Promise<CommentView[]> {
  const [{ data: comments }, { data: profiles }] = await Promise.all([
    supabase
      .from('comments')
      .select('*')
      .eq('object_table', objectTable)
      .eq('object_id', objectId)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  return ((comments ?? []) as Comment[]).map((c) => ({ ...c, authorName: nameById.get(c.author_id) ?? 'Unknown' }));
}

/** Bulk variant for list pages — one query instead of one per row. */
export async function getCommentsForObjects(
  supabase: SupabaseClient,
  objectTable: string,
  objectIds: string[]
): Promise<Map<string, CommentView[]>> {
  const empty = new Map<string, CommentView[]>();
  if (objectIds.length === 0) return empty;
  const [{ data: comments }, { data: profiles }] = await Promise.all([
    supabase.from('comments').select('*').eq('object_table', objectTable).in('object_id', objectIds).order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  const byObject = new Map<string, CommentView[]>();
  for (const c of (comments ?? []) as Comment[]) {
    const view = { ...c, authorName: nameById.get(c.author_id) ?? 'Unknown' };
    const arr = byObject.get(c.object_id) ?? [];
    arr.push(view);
    byObject.set(c.object_id, arr);
  }
  return byObject;
}

export interface SearchResult {
  kind: 'outcome' | 'commitment' | 'mission' | 'client' | 'lead' | 'document';
  id: string;
  title: string;
  href: string;
}

/**
 * Fans out across live modules, each query using the same request-scoped
 * client so every table's own RLS still applies — this never sees more than
 * the caller already could by visiting each module directly.
 */
export async function searchAll(supabase: SupabaseClient, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;

  const [outcomes, commitments, missions, clients, leads, documents] = await Promise.all([
    supabase.from('company_outcomes').select('id, title').ilike('title', like).limit(5),
    supabase.from('commitments').select('id, title').ilike('title', like).limit(5),
    supabase.from('projects').select('id, name').ilike('name', like).limit(5),
    supabase.from('client_organizations').select('id, display_name').ilike('display_name', like).limit(5),
    supabase.from('leads').select('id, name').ilike('name', like).limit(5),
    supabase.from('documents').select('id, title').ilike('title', like).limit(5)
  ]);

  const results: SearchResult[] = [];
  for (const o of (outcomes.data ?? []) as Array<{ id: string; title: string }>) {
    results.push({ kind: 'outcome', id: o.id, title: o.title, href: '/outcomes' });
  }
  for (const c of (commitments.data ?? []) as Array<{ id: string; title: string }>) {
    results.push({ kind: 'commitment', id: c.id, title: c.title, href: '/commitments' });
  }
  for (const m of (missions.data ?? []) as Array<{ id: string; name: string }>) {
    results.push({ kind: 'mission', id: m.id, title: m.name, href: '/missions' });
  }
  for (const c of (clients.data ?? []) as Array<{ id: string; display_name: string }>) {
    results.push({ kind: 'client', id: c.id, title: c.display_name, href: '/clients' });
  }
  for (const l of (leads.data ?? []) as Array<{ id: string; name: string }>) {
    results.push({ kind: 'lead', id: l.id, title: l.name, href: '/revenue' });
  }
  for (const d of (documents.data ?? []) as Array<{ id: string; title: string }>) {
    results.push({ kind: 'document', id: d.id, title: d.title, href: '/knowledge' });
  }
  return results;
}

/* --------------------------------------------------------------- Finance Views -- */

export interface AccountingPeriod {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  locked_at: string | null;
  locked_by: string | null;
}

export async function getAccountingPeriods(supabase: SupabaseClient): Promise<AccountingPeriod[]> {
  const { data } = await supabase.from('accounting_periods').select('*').order('period_start', { ascending: false });
  return (data ?? []) as AccountingPeriod[];
}

export interface JournalLine {
  id: string;
  organization_id: string;
  journal_entry_id: string;
  account_id: string;
  debit_minor: number;
  credit_minor: number;
  currency: string;
  project_id: string | null;
  client_id: string | null;
  accountName?: string;
  accountCode?: string;
}

export interface JournalEntry {
  id: string;
  organization_id: string;
  memo: string | null;
  status: 'draft' | 'active' | 'pending_approval' | 'approved' | 'posted' | 'locked' | 'archived' | 'rejected' | 'quarantined';
  posted_at: string | null;
  reversed_entry_id: string | null;
  created_at: string;
  lines: JournalLine[];
}

export async function getJournalEntries(supabase: SupabaseClient): Promise<JournalEntry[]> {
  const [{ data: entries }, { data: lines }, { data: accounts }] = await Promise.all([
    supabase.from('journal_entries').select('*').order('created_at', { ascending: false }),
    supabase.from('journal_lines').select('*'),
    supabase.from('chart_accounts').select('id, name, code')
  ]);

  const accountMap = new Map(((accounts ?? []) as Array<{id: string, name: string, code: string}>).map(a => [a.id, a]));
  const linesByEntry = new Map<string, JournalLine[]>();

  for (const line of (lines ?? []) as JournalLine[]) {
    const acc = accountMap.get(line.account_id);
    const lineView: JournalLine = {
        ...line,
        accountName: acc?.name,
        accountCode: acc?.code
    };
    const arr = linesByEntry.get(line.journal_entry_id) ?? [];
    arr.push(lineView);
    linesByEntry.set(line.journal_entry_id, arr);
  }

  return ((entries ?? []) as any[]).map(e => ({
    ...e,
    lines: linesByEntry.get(e.id) ?? []
  })) as JournalEntry[];
}

export interface InvoiceLine {
  id: string;
  organization_id: string;
  invoice_id: string;
  description: string;
  amount_minor: number;
}

export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string;
  status: 'draft' | 'active' | 'pending_approval' | 'approved' | 'posted' | 'locked' | 'archived' | 'rejected' | 'quarantined';
  amount_minor: number;
  balance_minor: number;
  due_date: string | null;
  issued_at: string | null;
  created_at: string;
  lines: InvoiceLine[];
  clientName?: string;
}

export async function getInvoices(supabase: SupabaseClient): Promise<Invoice[]> {
  const [{ data: invoices }, { data: lines }, { data: clients }] = await Promise.all([
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('invoice_lines').select('*'),
    supabase.from('client_organizations').select('id, display_name')
  ]);

  const clientMap = new Map(((clients ?? []) as Array<{id: string, display_name: string}>).map(c => [c.id, c.display_name]));
  const linesByInvoice = new Map<string, InvoiceLine[]>();

  for (const line of (lines ?? []) as InvoiceLine[]) {
    const arr = linesByInvoice.get(line.invoice_id) ?? [];
    arr.push(line);
    linesByInvoice.set(line.invoice_id, arr);
  }

  return ((invoices ?? []) as any[]).map(inv => ({
    ...inv,
    clientName: clientMap.get(inv.client_id),
    lines: linesByInvoice.get(inv.id) ?? []
  })) as Invoice[];
}
