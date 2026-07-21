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
