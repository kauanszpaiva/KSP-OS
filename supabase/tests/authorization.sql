-- Supabase authorization regression plan.
-- Required fixtures/identities: Founder CEO, Executive Operations, Project Manager assigned to Project A,
-- Project Manager not assigned to Project B, Specialist assigned to Project A, Contractor with temporary access,
-- Contractor after expiration, Client Owner for Client A, Client Approver for Client A Project A,
-- Billing Contact for Client A, Client Viewer for Client A, Client user for Client B, suspended user,
-- unaffiliated authenticated user, anonymous user.
-- Assertions: cross-organization denial; cross-client denial; cross-project denial; internal-note protection;
-- finance protection; client publication protection; safe create and update; no self-approval;
-- expired access denial; suspended access denial; storage isolation; external-to-internal privilege escalation denial.
select 'authorization regression plan present' as plan;
