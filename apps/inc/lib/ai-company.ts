import type { SupabaseClient } from '@ksp/database';

export const AI_COMPANY_GLOBAL_BUDGET_USD = 50;
export const AI_COMPANY_BUDGET_START = '2026-08-26';
export const AI_COMPANY_BUDGET_END = '2026-09-15';

export const AI_VERTICALS = [
  { key: 'inc', label: 'KSP INC' },
  { key: 'dominion', label: 'KSP Dominion' },
  { key: 'dev', label: 'KSP Dev' },
  { key: 'agency', label: 'KSP Agency' },
  { key: 'studios', label: 'KSP Studios' },
  { key: 'ventures', label: 'KSP Ventures' },
  { key: 'experiences', label: 'KSP Experiences' }
] as const;

export type AiVertical = (typeof AI_VERTICALS)[number]['key'];
export type AiPlane = 'internal' | 'client';
export type AiAgentPlane = AiPlane | 'shared_safe';
export type AiRank = 'super_ultra' | 'super' | 'ultra' | 'agent' | 'sub_agent';

export interface AiAgentSeed {
  agent_key: string;
  name: string;
  rank: AiRank;
  vertical: AiVertical;
  plane: AiAgentPlane;
  mandate: string;
  parent_agent_key: string | null;
  model_tier: string;
  capabilities: string[];
}

interface AgentTemplate {
  suffix: string;
  rank: AiRank;
  plane: AiAgentPlane;
  title: string;
  mandate: string;
  parentSuffix: string | null;
}

const TEMPLATES: AgentTemplate[] = [
  { suffix: 'commander', rank: 'super_ultra', plane: 'shared_safe', title: 'Mission Commander', mandate: 'Own the vertical outcome, approvals, integration and final evidence.', parentSuffix: null },
  { suffix: 'client.director', rank: 'super', plane: 'client', title: 'Client Delivery Director', mandate: 'Direct client-safe delivery without exposing KSP internal context.', parentSuffix: 'commander' },
  { suffix: 'internal.director', rank: 'super', plane: 'internal', title: 'Internal Operations Director', mandate: 'Direct internal execution, capacity, systems and operating truth.', parentSuffix: 'commander' },
  { suffix: 'client.lead', rank: 'ultra', plane: 'client', title: 'Client Delivery Lead', mandate: 'Lead scoped client research, planning and quality control.', parentSuffix: 'client.director' },
  { suffix: 'internal.lead', rank: 'ultra', plane: 'internal', title: 'Internal Operations Lead', mandate: 'Lead scoped internal research, planning and quality control.', parentSuffix: 'internal.director' },
  { suffix: 'client.manager', rank: 'agent', plane: 'client', title: 'Client Execution Manager', mandate: 'Execute bounded client deliverables and coordinate atomic workers.', parentSuffix: 'client.lead' },
  { suffix: 'internal.manager', rank: 'agent', plane: 'internal', title: 'Internal Execution Manager', mandate: 'Execute bounded internal deliverables and coordinate atomic workers.', parentSuffix: 'internal.lead' },
  { suffix: 'client.worker', rank: 'sub_agent', plane: 'client', title: 'Client Atomic Worker', mandate: 'Complete one narrow client-safe task with evidence.', parentSuffix: 'client.manager' },
  { suffix: 'internal.worker', rank: 'sub_agent', plane: 'internal', title: 'Internal Atomic Worker', mandate: 'Complete one narrow internal task with evidence.', parentSuffix: 'internal.manager' }
];

function titleForVertical(vertical: AiVertical) {
  return AI_VERTICALS.find((item) => item.key === vertical)?.label ?? vertical;
}

export function buildDefaultAgents(): AiAgentSeed[] {
  const rows = AI_VERTICALS.flatMap(({ key }) =>
    TEMPLATES.map((template) => ({
      agent_key: `${key}.${template.suffix}`,
      name: `${titleForVertical(key)} · ${template.title}`,
      rank: template.rank,
      vertical: key,
      plane: template.plane,
      mandate: template.mandate,
      parent_agent_key: template.parentSuffix ? `${key}.${template.parentSuffix}` : null,
      model_tier: template.rank === 'super_ultra' ? 'cheap_reasoning' : 'local_free',
      capabilities: ['mission_execution', 'evidence_required']
    }))
  );

  rows.push(
    {
      agent_key: 'inc.plane-governor',
      name: 'KSP INC · Plane Governor',
      rank: 'ultra',
      vertical: 'inc',
      plane: 'shared_safe',
      mandate: 'Enforce CLIENT versus INTERNAL scope, classification and safe handoffs.',
      parent_agent_key: 'inc.commander',
      model_tier: 'deterministic',
      capabilities: ['scope_guard', 'tenant_guard', 'data_classification']
    },
    {
      agent_key: 'inc.capability-lab',
      name: 'KSP INC · Capability Lab',
      rank: 'ultra',
      vertical: 'inc',
      plane: 'internal',
      mandate: 'Research, benchmark and promote skills, APIs, repositories, connectors and new agent roles.',
      parent_agent_key: 'inc.internal.director',
      model_tier: 'local_free',
      capabilities: ['research', 'benchmark', 'recruitment']
    },
    {
      agent_key: 'inc.budget-governor',
      name: 'KSP INC · Model Budget Governor',
      rank: 'ultra',
      vertical: 'inc',
      plane: 'internal',
      mandate: 'Block model/API spend that violates the active cash ceiling or mission budget.',
      parent_agent_key: 'inc.internal.director',
      model_tier: 'deterministic',
      capabilities: ['budget_guard', 'model_routing']
    }
  );

  return rows;
}

export interface AiTaskTemplate {
  taskKey: string;
  title: string;
  objective: string;
  agentKey: string;
  rank: AiRank;
  parallelGroup: number;
  dependsOn: string[];
}

function scopedAgent(vertical: AiVertical, plane: AiPlane, suffix: 'director' | 'lead' | 'manager' | 'worker') {
  return `${vertical}.${plane}.${suffix}`;
}

export function buildMissionPlan(vertical: AiVertical, plane: AiPlane): AiTaskTemplate[] {
  return [
    {
      taskKey: 'discover',
      title: 'Discover sources and constraints',
      objective: 'Identify the minimum relevant context, existing capabilities, dependencies and unknowns.',
      agentKey: scopedAgent(vertical, plane, 'lead'),
      rank: 'ultra',
      parallelGroup: 1,
      dependsOn: []
    },
    {
      taskKey: 'guard',
      title: 'Apply plane, risk and budget guardrails',
      objective: 'Validate data boundary, approval scope, zero-cost-first routing and failure conditions.',
      agentKey: 'inc.plane-governor',
      rank: 'ultra',
      parallelGroup: 1,
      dependsOn: []
    },
    {
      taskKey: 'plan',
      title: 'Build executable mission contract',
      objective: 'Convert the request into success criteria, sequence, evidence requirements and rollback conditions.',
      agentKey: scopedAgent(vertical, plane, 'director'),
      rank: 'super',
      parallelGroup: 2,
      dependsOn: ['discover', 'guard']
    },
    {
      taskKey: 'execute-primary',
      title: 'Execute primary slice',
      objective: 'Perform the bounded primary work allowed by the current runtime and record evidence.',
      agentKey: scopedAgent(vertical, plane, 'manager'),
      rank: 'agent',
      parallelGroup: 3,
      dependsOn: ['plan']
    },
    {
      taskKey: 'execute-support',
      title: 'Execute atomic support slice',
      objective: 'Complete one narrow support task and surface capability gaps for the Capability Lab.',
      agentKey: scopedAgent(vertical, plane, 'worker'),
      rank: 'sub_agent',
      parallelGroup: 3,
      dependsOn: ['plan']
    },
    {
      taskKey: 'verify',
      title: 'Verify outcome and evidence',
      objective: 'Check dependencies, scope isolation, budget, artifacts and completion claims independently.',
      agentKey: scopedAgent(vertical, plane, 'lead'),
      rank: 'ultra',
      parallelGroup: 4,
      dependsOn: ['execute-primary', 'execute-support']
    },
    {
      taskKey: 'approve',
      title: 'Integrate and approve mission state',
      objective: 'Integrate verified results and classify the mission honestly as done, blocked or failed.',
      agentKey: `${vertical}.commander`,
      rank: 'super_ultra',
      parallelGroup: 5,
      dependsOn: ['verify']
    }
  ];
}

export function isAiVertical(value: string): value is AiVertical {
  return AI_VERTICALS.some((item) => item.key === value);
}

export function isAiPlane(value: string): value is AiPlane {
  return value === 'internal' || value === 'client';
}

export function budgetAvailable(hardCap: number, spent: number) {
  return Math.max(0, Number((hardCap - spent).toFixed(6)));
}

export interface AiCompanyDashboard {
  schemaReady: boolean;
  agents: any[];
  missions: any[];
  tasks: any[];
  evidence: any[];
  capabilities: any[];
  clients: Array<{ id: string; display_name: string }>;
  budget: { hardCap: number; spent: number; available: number; start: string; end: string };
}

export async function getAiCompanyDashboard(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AiCompanyDashboard> {
  const clientsPromise = supabase
    .from('client_organizations')
    .select('id,display_name')
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .order('display_name');

  const agentsResult = await supabase
    .from('ai_company_agents')
    .select('agent_key,name,rank,vertical,plane,status,model_tier,mandate')
    .eq('organization_id', organizationId)
    .order('vertical')
    .order('agent_key');

  const clientsResult = await clientsPromise;
  if (agentsResult.error) {
    return {
      schemaReady: false,
      agents: [],
      missions: [],
      tasks: [],
      evidence: [],
      capabilities: [],
      clients: (clientsResult.data ?? []) as Array<{ id: string; display_name: string }>,
      budget: {
        hardCap: AI_COMPANY_GLOBAL_BUDGET_USD,
        spent: 0,
        available: AI_COMPANY_GLOBAL_BUDGET_USD,
        start: AI_COMPANY_BUDGET_START,
        end: AI_COMPANY_BUDGET_END
      }
    };
  }

  const missionsResult = await supabase
    .from('ai_company_missions')
    .select('id,title,objective,vertical,plane,client_organization_id,status,execution_mode,model_tier,budget_cap_usd,output,created_at,completed_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20);
  const missionIds = (missionsResult.data ?? []).map((row: any) => row.id);

  const [tasksResult, evidenceResult, capabilitiesResult, budgetEventsResult, policyResult] = await Promise.all([
    missionIds.length
      ? supabase.from('ai_company_tasks').select('id,mission_id,task_key,title,agent_key,rank,status,parallel_group,depends_on_task_keys,result,updated_at').in('mission_id', missionIds).order('parallel_group')
      : Promise.resolve({ data: [], error: null }),
    missionIds.length
      ? supabase.from('ai_company_evidence').select('id,mission_id,task_id,evidence_type,summary,source_ref,created_at').in('mission_id', missionIds).order('created_at')
      : Promise.resolve({ data: [], error: null }),
    supabase.from('ai_company_capabilities').select('capability_key,kind,name,status,cost_class,score,source_ref').eq('organization_id', organizationId).order('status').order('name'),
    supabase.from('ai_company_budget_events').select('actual_usd,created_at').eq('organization_id', organizationId).eq('event_type', 'usage').gte('created_at', `${AI_COMPANY_BUDGET_START}T00:00:00Z`).lte('created_at', `${AI_COMPANY_BUDGET_END}T23:59:59Z`),
    supabase.from('ai_company_budget_policies').select('hard_cap_usd,period_start,period_end').eq('organization_id', organizationId).eq('active', true).order('period_start', { ascending: false }).limit(1).maybeSingle()
  ]);

  const spent = (budgetEventsResult.data ?? []).reduce(
    (sum: number, row: any) => sum + Number(row.actual_usd ?? 0),
    0
  );
  const hardCap = Number((policyResult.data as any)?.hard_cap_usd ?? AI_COMPANY_GLOBAL_BUDGET_USD);

  return {
    schemaReady: true,
    agents: agentsResult.data ?? [],
    missions: missionsResult.data ?? [],
    tasks: (tasksResult as any).data ?? [],
    evidence: (evidenceResult as any).data ?? [],
    capabilities: capabilitiesResult.data ?? [],
    clients: (clientsResult.data ?? []) as Array<{ id: string; display_name: string }>,
    budget: {
      hardCap,
      spent,
      available: budgetAvailable(hardCap, spent),
      start: String((policyResult.data as any)?.period_start ?? AI_COMPANY_BUDGET_START),
      end: String((policyResult.data as any)?.period_end ?? AI_COMPANY_BUDGET_END)
    }
  };
}
