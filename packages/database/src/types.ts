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
  link: string | null;
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

export type ClientRole = 'client_owner' | 'client_project_approver' | 'client_billing_contact' | 'client_collaborator' | 'client_viewer';

export interface ClientMembership {
  id: string;
  organization_id: string;
  client_organization_id: string;
  profile_id: string;
  role: ClientRole;
  effective_from: string;
  effective_until: string | null;
  suspended_at: string | null;
  created_at: string;
}

export interface PortalInvitation {
  id: string;
  organization_id: string;
  client_organization_id: string;
  email: string;
  initial_role: ClientRole;
  invited_by: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
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

export type PublicationState = 'internal_draft' | 'internal_review' | 'approved_for_client' | 'published_to_client' | 'withdrawn' | 'archived';

export interface ClientPublication {
  id: string;
  organization_id: string;
  client_organization_id: string;
  project_id: string | null;
  source_table: string;
  source_id: string;
  title: string;
  summary: string;
  state: PublicationState;
  published_at: string | null;
  published_by: string | null;
  version_hash: string | null;
  created_at: string;
}

export interface ClientUpdate {
  id: string;
  organization_id: string;
  publication_id: string;
  body: string;
  created_at: string;
}

export type ClientRequestStatus =
  | 'submitted'
  | 'received'
  | 'under_triage'
  | 'needs_client_information'
  | 'under_evaluation'
  | 'estimate_in_preparation'
  | 'awaiting_client_approval'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'client_review'
  | 'completed'
  | 'rejected'
  | 'canceled'
  | 'converted_to_change_order';

export interface ClientRequest {
  id: string;
  organization_id: string;
  client_organization_id: string;
  project_id: string | null;
  submitted_by: string;
  title: string;
  body: string;
  status: ClientRequestStatus;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

/* --------------------------------------------------------- Phase C5 -- */

export interface DocumentRecord {
  id: string;
  organization_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  storage_path: string;
  checksum: string | null;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  client_visible: boolean;
  retention_category: string | null;
  legal_hold: boolean;
  status: RecordStatus;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  vendor: string;
  product: string;
  owner_id: string | null;
  cost_minor: number;
  currency: string;
  billing_frequency: string;
  renewal_date: string | null;
  auto_renewal: boolean;
  status: RecordStatus;
}

export interface IntegrationConnection {
  id: string;
  organization_id: string;
  provider: string;
  scopes: string[];
  token_expires_at: string | null;
  status: RecordStatus;
  metadata: Record<string, unknown>;
}

export interface ChartAccount {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  account_type: string;
  status: RecordStatus;
}

export interface JournalEntry {
  id: string;
  organization_id: string;
  memo: string | null;
  status: RecordStatus;
  posted_at: string | null;
  reversed_entry_id: string | null;
  created_at: string;
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
}

/* --------------------------------------------------------- Phase C6 -- */

export interface Notification {
  id: string;
  organization_id: string;
  recipient_id: string;
  actor_id: string | null;
  verb: string;
  object_table: string;
  object_id: string | null;
  summary: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  organization_id: string;
  object_table: string;
  object_id: string;
  author_id: string;
  body: string;
  mentions: string[];
  created_at: string;
}

/* --------------------------------------------------------- Phase P2 -- */

export interface ChangeOrder {
  id: string;
  organization_id: string;
  client_organization_id: string;
  project_id: string;
  client_request_id: string | null;
  status: RecordStatus;
  created_by: string | null;
  created_at: string;
}

export interface ChangeOrderVersion {
  id: string;
  organization_id: string;
  change_order_id: string;
  version_number: number;
  state: PublicationState;
  scope_summary: string;
  price_minor: number;
  currency: string;
  version_hash: string;
  accepted_at: string | null;
  created_at: string;
}

export interface ChangeOrderItem {
  id: string;
  organization_id: string;
  change_order_version_id: string;
  description: string;
  amount_minor: number;
  currency: string;
}

export interface ChangeOrderClientDecision {
  id: string;
  organization_id: string;
  change_order_version_id: string;
  client_organization_id: string;
  decided_by: string;
  decision: 'accepted' | 'rejected';
  evidence: Record<string, unknown>;
  created_at: string;
}

export interface RequestStatusHistory {
  id: string;
  organization_id: string;
  client_request_id: string;
  from_status: ClientRequestStatus | null;
  to_status: ClientRequestStatus;
  changed_by: string | null;
  client_visible: boolean;
  created_at: string;
}

export interface RequestComment {
  id: string;
  organization_id: string;
  client_request_id: string;
  author_id: string;
  body: string;
  visibility: 'internal' | 'client';
  created_at: string;
}
