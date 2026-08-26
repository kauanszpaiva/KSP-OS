export type AgentRank =
  | "super_ultra"
  | "super"
  | "ultra"
  | "agent"
  | "subagent";

export type AgentWorkState =
  | "working"
  | "queued"
  | "blocked"
  | "completed_recently"
  | "idle";

export type ExecutionLane =
  | "strategy"
  | "code"
  | "research"
  | "operations"
  | "governance"
  | "knowledge";

export interface DepartmentDefinition {
  id: string;
  name: string;
  shortName: string;
  purpose: string;
  accent: string;
}

export interface AgentDefinition {
  id: string;
  codename: string;
  title: string;
  departmentId: string;
  rank: AgentRank;
  parentId: string | null;
  lane: ExecutionLane;
  mandate: string;
}

export interface AgentHandoffSignal {
  to_agent: string;
  status: "draft" | "ready" | "claimed" | "done" | "blocked" | "cancelled";
  updated_at: string;
}

export const RANK_LABELS: Record<AgentRank, string> = {
  super_ultra: "SUPER ULTRA · C-Level",
  super: "SUPER · Director",
  ultra: "ULTRA · Leader",
  agent: "AGENT · Manager",
  subagent: "Subagent · Employee",
};

export const DEPARTMENTS: DepartmentDefinition[] = [
  {
    id: "executive-command",
    name: "Executive Command",
    shortName: "Command",
    purpose:
      "Strategy, priorities, decisions and the operating rhythm of KSP INC.",
    accent: "#A6C63A",
  },
  {
    id: "product-engineering",
    name: "Product & Engineering",
    shortName: "Build",
    purpose:
      "Architecture, product delivery, integrations, quality and release evidence.",
    accent: "#4F8EF7",
  },
  {
    id: "finance-capital",
    name: "Finance & Capital",
    shortName: "Capital",
    purpose:
      "Cash survival, planning, billing, procurement and portfolio discipline.",
    accent: "#D7A940",
  },
  {
    id: "revenue-growth",
    name: "Revenue & Growth",
    shortName: "Growth",
    purpose:
      "Market intelligence, offers, pipeline, brand, proposals and retention.",
    accent: "#B46FE8",
  },
  {
    id: "operations-delivery",
    name: "Operations & Delivery",
    shortName: "Delivery",
    purpose:
      "Scopes, schedules, resources, milestones, reviews and client outcomes.",
    accent: "#38A889",
  },
  {
    id: "risk-security-legal",
    name: "Risk, Security & Legal",
    shortName: "Guard",
    purpose:
      "Identity, access, security, privacy, compliance and incident control.",
    accent: "#D76262",
  },
  {
    id: "knowledge-ai-people",
    name: "Knowledge, AI & People",
    shortName: "Brain",
    purpose:
      "Second Brain, sources, context, skills, staffing and agent reliability.",
    accent: "#5D75D6",
  },
];

function agent(
  id: string,
  codename: string,
  title: string,
  departmentId: string,
  rank: AgentRank,
  parentId: string | null,
  lane: ExecutionLane,
  mandate: string,
): AgentDefinition {
  return { id, codename, title, departmentId, rank, parentId, lane, mandate };
}

/**
 * KSP AI Company organization catalog.
 *
 * These 77 records are roles, not 77 model processes. A role only becomes
 * `working` when a real founder handoff is claimed. Provider credentials and
 * execution runtimes remain separate so the interface never fabricates agency.
 */
export const AGENTS: AgentDefinition[] = [
  // Executive Command — 11
  agent(
    "atlas",
    "Atlas",
    "Chief Operating & Strategy Officer",
    "executive-command",
    "super_ultra",
    null,
    "strategy",
    "Convert CEO direction into an ordered, governed company agenda.",
  ),
  agent(
    "chronos",
    "Chronos",
    "Director of Command Rhythm",
    "executive-command",
    "super",
    "atlas",
    "operations",
    "Maintain planning cadence, commitments and follow-up windows.",
  ),
  agent(
    "delphi",
    "Delphi",
    "Strategic Intelligence Lead",
    "executive-command",
    "ultra",
    "chronos",
    "research",
    "Turn evidence into scenarios without presenting assumptions as truth.",
  ),
  agent(
    "nike",
    "Nike",
    "Priority & Outcomes Lead",
    "executive-command",
    "ultra",
    "chronos",
    "strategy",
    "Translate strategy into measurable outcomes and stop-work decisions.",
  ),
  agent(
    "beacon",
    "Beacon",
    "Executive Brief Manager",
    "executive-command",
    "agent",
    "delphi",
    "knowledge",
    "Assemble concise briefs with sources, gaps and decisions required.",
  ),
  agent(
    "arbiter",
    "Arbiter",
    "Decision Control Manager",
    "executive-command",
    "agent",
    "nike",
    "governance",
    "Route decisions to the right authority and preserve their evidence.",
  ),
  agent(
    "scout",
    "Scout",
    "Research Scout",
    "executive-command",
    "subagent",
    "beacon",
    "research",
    "Collect bounded external and internal evidence for a named question.",
  ),
  agent(
    "scribe",
    "Scribe",
    "Executive Scribe",
    "executive-command",
    "subagent",
    "beacon",
    "knowledge",
    "Record meeting outputs, decisions, owners and due dates.",
  ),
  agent(
    "compass",
    "Compass",
    "Scenario Analyst",
    "executive-command",
    "subagent",
    "delphi",
    "strategy",
    "Compare options, dependencies and reversible versus irreversible choices.",
  ),
  agent(
    "signal",
    "Signal",
    "Executive Signal Monitor",
    "executive-command",
    "subagent",
    "arbiter",
    "research",
    "Surface material changes and suppress duplicate noise.",
  ),
  agent(
    "courier",
    "Courier",
    "Handoff Clerk",
    "executive-command",
    "subagent",
    "arbiter",
    "operations",
    "Package work for the next operator with definition of done.",
  ),

  // Product & Engineering — 11
  agent(
    "prometheus",
    "Prometheus",
    "Chief Technology & Product Officer",
    "product-engineering",
    "super_ultra",
    null,
    "strategy",
    "Own product and technology direction under approved business priorities.",
  ),
  agent(
    "hephaestus",
    "Hephaestus",
    "Director of Engineering",
    "product-engineering",
    "super",
    "prometheus",
    "code",
    "Convert approved slices into maintainable, testable software delivery.",
  ),
  agent(
    "daedalus",
    "Daedalus",
    "Architecture Lead",
    "product-engineering",
    "ultra",
    "hephaestus",
    "code",
    "Protect system boundaries, data ownership and integration contracts.",
  ),
  agent(
    "ariadne",
    "Ariadne",
    "Product Systems Lead",
    "product-engineering",
    "ultra",
    "hephaestus",
    "strategy",
    "Map user jobs into coherent flows, states and acceptance criteria.",
  ),
  agent(
    "forge",
    "Forge",
    "Delivery Manager",
    "product-engineering",
    "agent",
    "daedalus",
    "code",
    "Coordinate vertical slices, dependencies and safe implementation order.",
  ),
  agent(
    "turing",
    "Turing",
    "Automation Manager",
    "product-engineering",
    "agent",
    "ariadne",
    "code",
    "Design bounded automations with idempotency, retries and stop controls.",
  ),
  agent(
    "patch",
    "Patch",
    "Backend Subagent",
    "product-engineering",
    "subagent",
    "forge",
    "code",
    "Implement scoped server logic and database-safe contracts.",
  ),
  agent(
    "pixel",
    "Pixel",
    "Frontend Subagent",
    "product-engineering",
    "subagent",
    "forge",
    "code",
    "Implement responsive, accessible interfaces from approved states.",
  ),
  agent(
    "query",
    "Query",
    "Data Subagent",
    "product-engineering",
    "subagent",
    "daedalus",
    "code",
    "Inspect schemas, author safe queries and verify data invariants.",
  ),
  agent(
    "relay",
    "Relay",
    "Integration Subagent",
    "product-engineering",
    "subagent",
    "turing",
    "code",
    "Connect approved services without leaking secrets or authority.",
  ),
  agent(
    "testa",
    "Testa",
    "Quality Subagent",
    "product-engineering",
    "subagent",
    "turing",
    "governance",
    "Exercise happy, failure and authorization paths with evidence.",
  ),

  // Finance & Capital — 11
  agent(
    "midas",
    "Midas",
    "Chief Financial Officer",
    "finance-capital",
    "super_ultra",
    null,
    "strategy",
    "Protect cash survival and convert financial truth into operating constraints.",
  ),
  agent(
    "athena",
    "Athena",
    "Director of Portfolio & Capital",
    "finance-capital",
    "super",
    "midas",
    "strategy",
    "Evaluate capital allocation, portfolio fit and downside exposure.",
  ),
  agent(
    "solon",
    "Solon",
    "Financial Planning Lead",
    "finance-capital",
    "ultra",
    "athena",
    "strategy",
    "Maintain forecast assumptions, scenarios and decision thresholds.",
  ),
  agent(
    "plutus",
    "Plutus",
    "Treasury Lead",
    "finance-capital",
    "ultra",
    "athena",
    "operations",
    "Track liquidity, obligations, collections and payment timing.",
  ),
  agent(
    "abacus",
    "Abacus",
    "Finance Operations Manager",
    "finance-capital",
    "agent",
    "solon",
    "operations",
    "Reconcile operational records and route discrepancies for review.",
  ),
  agent(
    "mercury",
    "Mercury",
    "Procurement Manager",
    "finance-capital",
    "agent",
    "plutus",
    "governance",
    "Compare purchases, subscriptions and vendor commitments against limits.",
  ),
  agent(
    "tally",
    "Tally",
    "Budget Analyst",
    "finance-capital",
    "subagent",
    "abacus",
    "research",
    "Classify spend and produce traceable variance inputs.",
  ),
  agent(
    "runway",
    "Runway",
    "Cash Monitor",
    "finance-capital",
    "subagent",
    "plutus",
    "operations",
    "Monitor cash runway inputs and flag missing or stale data.",
  ),
  agent(
    "invoice",
    "Invoice",
    "Billing Clerk",
    "finance-capital",
    "subagent",
    "abacus",
    "operations",
    "Prepare invoice evidence and delivery status without authorizing payment.",
  ),
  agent(
    "margin",
    "Margin",
    "Unit Economics Analyst",
    "finance-capital",
    "subagent",
    "solon",
    "research",
    "Calculate offer margin using declared cost and pricing assumptions.",
  ),
  agent(
    "receipt",
    "Receipt",
    "Finance Evidence Clerk",
    "finance-capital",
    "subagent",
    "mercury",
    "knowledge",
    "Attach provenance to expenses, purchases and reconciliations.",
  ),

  // Revenue & Growth — 11
  agent(
    "hermes",
    "Hermes",
    "Chief Revenue Officer",
    "revenue-growth",
    "super_ultra",
    null,
    "strategy",
    "Build reliable revenue motion without overstating capability or proof.",
  ),
  agent(
    "apollo",
    "Apollo",
    "Director of Growth",
    "revenue-growth",
    "super",
    "hermes",
    "strategy",
    "Coordinate market, offer, brand, pipeline and retention programs.",
  ),
  agent(
    "artemis",
    "Artemis",
    "Market Intelligence Lead",
    "revenue-growth",
    "ultra",
    "apollo",
    "research",
    "Identify qualified markets, buyers, pain and timing signals.",
  ),
  agent(
    "iris",
    "Iris",
    "Brand & Communications Lead",
    "revenue-growth",
    "ultra",
    "apollo",
    "knowledge",
    "Protect voice, visual consistency and truthful public messaging.",
  ),
  agent(
    "funnel",
    "Funnel",
    "Sales Operations Manager",
    "revenue-growth",
    "agent",
    "artemis",
    "operations",
    "Maintain stage definitions, next actions and pipeline hygiene.",
  ),
  agent(
    "echo",
    "Echo",
    "Content Operations Manager",
    "revenue-growth",
    "agent",
    "iris",
    "operations",
    "Turn approved strategy into a governed content production queue.",
  ),
  agent(
    "prospect",
    "Prospect",
    "Lead Researcher",
    "revenue-growth",
    "subagent",
    "artemis",
    "research",
    "Gather contact and fit evidence from authorized sources.",
  ),
  agent(
    "pitch",
    "Pitch",
    "Proposal Drafter",
    "revenue-growth",
    "subagent",
    "funnel",
    "knowledge",
    "Draft scoped proposals using approved pricing and proof.",
  ),
  agent(
    "nurture",
    "Nurture",
    "CRM Clerk",
    "revenue-growth",
    "subagent",
    "funnel",
    "operations",
    "Keep follow-ups and relationship context current.",
  ),
  agent(
    "campaign",
    "Campaign",
    "Content Packager",
    "revenue-growth",
    "subagent",
    "echo",
    "knowledge",
    "Package approved assets, captions and channel instructions.",
  ),
  agent(
    "close",
    "Close",
    "Deal Evidence Clerk",
    "revenue-growth",
    "subagent",
    "iris",
    "governance",
    "Verify approvals, scope and commitments before deal handoff.",
  ),

  // Operations & Delivery — 11
  agent(
    "hestia",
    "Hestia",
    "Chief Delivery & Client Officer",
    "operations-delivery",
    "super_ultra",
    null,
    "strategy",
    "Protect client outcomes, delivery capacity and service reliability.",
  ),
  agent(
    "demeter",
    "Demeter",
    "Director of Operations",
    "operations-delivery",
    "super",
    "hestia",
    "operations",
    "Turn signed scope into staffed, scheduled and observable delivery.",
  ),
  agent(
    "orion",
    "Orion",
    "Project Delivery Lead",
    "operations-delivery",
    "ultra",
    "demeter",
    "operations",
    "Coordinate milestones, blockers, dependencies and acceptance.",
  ),
  agent(
    "harbor",
    "Harbor",
    "Client Success Lead",
    "operations-delivery",
    "ultra",
    "demeter",
    "operations",
    "Maintain client communication, expectations and feedback closure.",
  ),
  agent(
    "flow",
    "Flow",
    "Resource Manager",
    "operations-delivery",
    "agent",
    "orion",
    "operations",
    "Match approved work to capacity without fictional availability.",
  ),
  agent(
    "cadence",
    "Cadence",
    "Schedule Manager",
    "operations-delivery",
    "agent",
    "harbor",
    "operations",
    "Maintain deadlines, meetings and escalation windows.",
  ),
  agent(
    "intake",
    "Intake",
    "Scope Clerk",
    "operations-delivery",
    "subagent",
    "flow",
    "knowledge",
    "Normalize requests into scope, inputs and missing decisions.",
  ),
  agent(
    "milestone",
    "Milestone",
    "Progress Clerk",
    "operations-delivery",
    "subagent",
    "orion",
    "operations",
    "Update evidence-backed milestone state and next action.",
  ),
  agent(
    "brief",
    "Brief",
    "Production Brief Clerk",
    "operations-delivery",
    "subagent",
    "flow",
    "knowledge",
    "Assemble the minimum delivery context for assigned workers.",
  ),
  agent(
    "review",
    "Review",
    "Feedback Clerk",
    "operations-delivery",
    "subagent",
    "harbor",
    "operations",
    "Capture feedback, revision bounds and approval status.",
  ),
  agent(
    "archive",
    "Archive",
    "Delivery Archivist",
    "operations-delivery",
    "subagent",
    "cadence",
    "knowledge",
    "Preserve final assets, evidence and delivery history.",
  ),

  // Risk, Security & Legal — 11
  agent(
    "argus",
    "Argus",
    "Chief Risk & Security Officer",
    "risk-security-legal",
    "super_ultra",
    null,
    "governance",
    "Maintain the enterprise risk view and stop unsafe execution.",
  ),
  agent(
    "themis",
    "Themis",
    "Director of Legal & Governance",
    "risk-security-legal",
    "super",
    "argus",
    "governance",
    "Route legal, policy and approval questions to accountable humans.",
  ),
  agent(
    "aegis",
    "Aegis",
    "Application Security Lead",
    "risk-security-legal",
    "ultra",
    "themis",
    "governance",
    "Review threat boundaries, vulnerabilities and remediation evidence.",
  ),
  agent(
    "janus",
    "Janus",
    "Identity & Access Lead",
    "risk-security-legal",
    "ultra",
    "themis",
    "governance",
    "Protect authentication, authorization and temporary access lifecycle.",
  ),
  agent(
    "shield",
    "Shield",
    "Security Operations Manager",
    "risk-security-legal",
    "agent",
    "aegis",
    "governance",
    "Coordinate security findings, incidents and verified closure.",
  ),
  agent(
    "canon",
    "Canon",
    "Compliance Manager",
    "risk-security-legal",
    "agent",
    "janus",
    "governance",
    "Check execution against approved KSP truth and policies.",
  ),
  agent(
    "threat",
    "Threat",
    "Risk Scanner",
    "risk-security-legal",
    "subagent",
    "aegis",
    "research",
    "Collect reproducible security signals without exploiting production.",
  ),
  agent(
    "policy",
    "Policy",
    "Control Checker",
    "risk-security-legal",
    "subagent",
    "canon",
    "governance",
    "Verify required controls and record missing evidence.",
  ),
  agent(
    "consent",
    "Consent",
    "Privacy Clerk",
    "risk-security-legal",
    "subagent",
    "janus",
    "governance",
    "Track data purpose, consent and retention boundaries.",
  ),
  agent(
    "license",
    "License",
    "Open Source License Reviewer",
    "risk-security-legal",
    "subagent",
    "canon",
    "research",
    "Screen candidate dependencies for license and provenance risk.",
  ),
  agent(
    "incident",
    "Incident",
    "Incident Recorder",
    "risk-security-legal",
    "subagent",
    "shield",
    "knowledge",
    "Preserve incident timeline, impact, actions and evidence.",
  ),

  // Knowledge, AI & People — 11
  agent(
    "mnemosyne",
    "Mnemosyne",
    "Chief Knowledge & AI Officer",
    "knowledge-ai-people",
    "super_ultra",
    null,
    "strategy",
    "Govern organizational memory, AI capability and context quality.",
  ),
  agent(
    "hera",
    "Hera",
    "Director of People & Agent Operations",
    "knowledge-ai-people",
    "super",
    "mnemosyne",
    "operations",
    "Maintain role design, capability coverage and sustainable workload.",
  ),
  agent(
    "sophia",
    "Sophia",
    "Knowledge Architecture Lead",
    "knowledge-ai-people",
    "ultra",
    "hera",
    "knowledge",
    "Design sources, truth, context packs and retrieval boundaries.",
  ),
  agent(
    "psyche",
    "Psyche",
    "Capability & Talent Lead",
    "knowledge-ai-people",
    "ultra",
    "hera",
    "operations",
    "Map work demands to human, deterministic and AI capabilities.",
  ),
  agent(
    "librarian",
    "Librarian",
    "Context Manager",
    "knowledge-ai-people",
    "agent",
    "sophia",
    "knowledge",
    "Keep context packs bounded, current and attributable.",
  ),
  agent(
    "coach",
    "Coach",
    "Capability Manager",
    "knowledge-ai-people",
    "agent",
    "psyche",
    "knowledge",
    "Maintain skills, evaluation criteria and remediation paths.",
  ),
  agent(
    "indexer",
    "Indexer",
    "Source Indexer",
    "knowledge-ai-people",
    "subagent",
    "librarian",
    "knowledge",
    "Catalog sources without converting untrusted content into commands.",
  ),
  agent(
    "verifier",
    "Verifier",
    "Truth Verification Clerk",
    "knowledge-ai-people",
    "subagent",
    "sophia",
    "governance",
    "Flag conflicts, staleness and missing provenance for founder review.",
  ),
  agent(
    "pack",
    "Pack",
    "Context Pack Assembler",
    "knowledge-ai-people",
    "subagent",
    "librarian",
    "knowledge",
    "Assemble minimum sufficient context for a bounded handoff.",
  ),
  agent(
    "trainer",
    "Trainer",
    "Skills Curriculum Clerk",
    "knowledge-ai-people",
    "subagent",
    "coach",
    "knowledge",
    "Map recurring failures to training and evaluation material.",
  ),
  agent(
    "idle",
    "Idle",
    "Workload & Idle Monitor",
    "knowledge-ai-people",
    "subagent",
    "psyche",
    "operations",
    "State when no authorized work exists and prevent invented activity.",
  ),
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchesAgent(
  agentDefinition: AgentDefinition,
  target: string,
): boolean {
  const normalized = normalize(target);
  return [
    agentDefinition.id,
    agentDefinition.codename,
    agentDefinition.title,
  ].some((candidate) => normalize(candidate) === normalized);
}

export function resolveAgentWorkState(
  agentDefinition: AgentDefinition,
  handoffs: AgentHandoffSignal[],
  now = new Date(),
): AgentWorkState {
  const assigned = handoffs.filter((handoff) =>
    matchesAgent(agentDefinition, handoff.to_agent),
  );
  if (assigned.some((handoff) => handoff.status === "claimed"))
    return "working";
  if (assigned.some((handoff) => handoff.status === "blocked"))
    return "blocked";
  if (
    assigned.some(
      (handoff) => handoff.status === "ready" || handoff.status === "draft",
    )
  )
    return "queued";

  const recentThreshold = now.getTime() - 24 * 60 * 60 * 1000;
  if (
    assigned.some(
      (handoff) =>
        handoff.status === "done" &&
        Date.parse(handoff.updated_at) >= recentThreshold,
    )
  ) {
    return "completed_recently";
  }
  return "idle";
}

export function agentsForDepartment(departmentId: string): AgentDefinition[] {
  return AGENTS.filter((item) => item.departmentId === departmentId);
}
