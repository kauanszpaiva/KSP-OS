/**
 * Focused schema types for the operational vertical slice. This is intentionally
 * a hand-written subset (not a full generated dump) covering the tables the slice
 * reads and writes. Extend as later phases land tables.
 */

export type RecordStatus =
  | 'draft'
  | 'active'
  | 'pending_approval'
  | 'approved'
  | 'posted'
  | 'locked'
  | 'archived'
  | 'rejected'
  | 'quarantined';

export type OutcomeState = 'active' | 'paused' | 'completed' | 'replaced';

export type CommitmentState =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'proof_submitted'
  | 'completed'
  | 'rejected'
  | 'archived';

export type ProofKind =
  | 'file'
  | 'url'
  | 'commit'
  | 'deployment'
  | 'payment'
  | 'approval'
  | 'note';

export interface CompanyOutcome {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  metric: string | null;
  target: string | null;
  horizon_days: number | null;
  state: OutcomeState;
  progress: number;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  closed_at: string | null;
}

export interface Commitment {
  id: string;
  organization_id: string;
  outcome_id: string | null;
  title: string;
  outcome_statement: string;
  context: string | null;
  owner_id: string;
  due_date: string | null;
  next_action_date: string | null;
  requires_proof: boolean;
  state: CommitmentState;
  progress: number;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CommitmentAssignment {
  id: string;
  organization_id: string;
  commitment_id: string;
  profile_id: string;
  role: 'accountable' | 'contributor';
  assigned_by: string | null;
  created_at: string;
}

export interface Proof {
  id: string;
  organization_id: string;
  commitment_id: string;
  kind: ProofKind;
  reference: string;
  description: string | null;
  submitted_by: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  organization_id: string;
  actor_id: string | null;
  verb: string;
  object_table: string;
  object_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  status: RecordStatus;
}

/* --------------------------------------------------------- Phase C2 -- */

export type SignalTriageStatus = 'new' | 'triaged' | 'converted' | 'dismissed';

export interface InboxItem {
  id: string;
  organization_id: string;
  created_by: string | null;
  item_type: string;
  title: string;
  body: string | null;
  triage_status: SignalTriageStatus;
  target_table: string | null;
  target_id: string | null;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  created_at: string;
}

export type ApprovalType =
  | 'executive_access'
  | 'bank_destination'
  | 'high_value_payment'
  | 'contract_change'
  | 'pricing_exception'
  | 'period_reopen'
  | 'bulk_export'
  | 'production_credential'
  | 'rls_auth_change'
  | 'protected_deletion'
  | 'agent_autonomy'
  | 'high_risk_publication'
  | 'deployment_exception';

export interface ApprovalRequest {
  id: string;
  organization_id: string;
  requester_id: string;
  approval_type: ApprovalType;
  amount_minor: number | null;
  currency: string | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  evidence: unknown[];
  status: RecordStatus;
  due_at: string | null;
  created_at: string;
}

export interface ApprovalDecision {
  id: string;
  organization_id: string;
  approval_request_id: string;
  approver_id: string;
  decision: 'approved' | 'rejected';
  comments: string | null;
  created_at: string;
}

/* --------------------------------------------------------- Phase C3 -- */

export interface Project {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  project_type: string;
  health: string;
  budget_minor: number | null;
  currency: string | null;
  next_action: string | null;
  status: RecordStatus;
  created_at: string;
  archived_at: string | null;
}

export interface ProjectMembership {
  id: string;
  organization_id: string;
  project_id: string;
  profile_id: string;
  role: string;
  effective_until: string | null;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'done' | 'at_risk';

export interface MissionMilestone {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  phase: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export interface MissionDependency {
  id: string;
  organization_id: string;
  project_id: string;
  depends_on_project_id: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  project_id: string | null;
  owner_id: string | null;
  title: string;
  due_date: string | null;
  blocked: boolean;
  client_visible: boolean;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  status: RecordStatus;
  created_at: string;
}

/* --------------------------------------------------------- Phase C4 -- */

export interface Lead {
  id: string;
  organization_id: string;
  owner_id: string;
  name: string;
  source: string | null;
  expected_value_minor: number | null;
  currency: string | null;
  probability: number | null;
  target_close_date: string | null;
  next_action: string | null;
  status: RecordStatus;
  created_at: string;
}

export interface ClientOrganization {
  id: string;
  organization_id: string;
  legal_name: string;
  display_name: string;
  relationship_health: string;
  status: RecordStatus;
  created_at: string;
  created_by: string | null;
  archived_at: string | null;
}

export interface Contact {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  client_visible: boolean;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  created_at: string;
}

export interface ClientInternalNote {
  id: string;
  organization_id: string;
  client_organization_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price_minor: number | null;
  currency: string | null;
  category: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  objective: string | null;
  audience: string | null;
  channel: string | null;
  budget_minor: number | null;
  currency: string | null;
  status: RecordStatus;
  created_by: string | null;
  created_at: string;
}

export type ContentStatus = 'idea' | 'drafting' | 'internal_review' | 'client_review' | 'approved' | 'scheduled' | 'published';

export interface ContentItem {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  client_id: string | null;
  title: string;
  channel: string;
  publish_date: string | null;
  status: ContentStatus;
  brief_ready: boolean;
  asset_ready: boolean;
  rights_cleared: boolean;
  caption_ready: boolean;
  link: string | null;
  created_by: string | null;
  created_at: string;
}
