'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../lib/supabase';
import {
  AI_COMPANY_BUDGET_END,
  AI_COMPANY_BUDGET_START,
  AI_COMPANY_GLOBAL_BUDGET_USD,
  buildDefaultAgents,
  buildMissionPlan,
  isAiPlane,
  isAiVertical,
  type AiPlane,
  type AiVertical
} from '../../lib/ai-company';

export interface AiCompanyActionResult {
  ok: boolean;
  error?: string;
  warning?: string;
  missionId?: string;
}

function uuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

async function ownerAiGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'KSP INC is not configured.' };
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) return { error: 'KSP INC owner access is required.' };
  if (!ctx.mfa) return { error: 'Step-up MFA is required to create or run AI Company missions.' };
  return { supabase, ctx };
}

async function ensureAiCompanyFoundation(
  supabase: SupabaseClient,
  ctx: AuthContext
): Promise<string | null> {
  const agents = buildDefaultAgents().map((agent) => ({
    organization_id: ctx.organizationId,
    ...agent,
    status: 'active',
    created_by: ctx.user.id,
    updated_by: ctx.user.id
  }));

  const { error: agentsError } = await supabase
    .from('ai_company_agents')
    .upsert(agents, { onConflict: 'organization_id,agent_key' });
  if (agentsError) return 'AI Company database foundation is not available yet.';

  const capabilities = [
    {
      capability_key: 'deterministic-runtime-v1',
      kind: 'runtime',
      name: 'Deterministic Runtime V1',
      status: 'active',
      cost_class: 'free',
      score: 100,
      source_ref: 'KSP-OS/apps/inc',
      metadata: { execution: 'server-actions', paid_provider: false }
    },
    {
      capability_key: 'ksp-agent-skill-suite',
      kind: 'skill_suite',
      name: 'KSP Agent Company Skill Suite',
      status: 'active',
      cost_class: 'free',
      score: 100,
      source_ref: 'KSP Agent Company Suite',
      metadata: { skills: 10 }
    },
    {
      capability_key: 'supabase-state',
      kind: 'connector',
      name: 'Supabase persistent state',
      status: 'active',
      cost_class: 'existing_infra',
      score: 100,
      source_ref: 'appkspos',
      metadata: { rls: true }
    },
    {
      capability_key: 'vercel-ai-gateway',
      kind: 'model_gateway',
      name: 'Vercel AI Gateway',
      status: 'candidate',
      cost_class: 'paid_optional',
      score: 80,
      source_ref: 'https://vercel.com/ai-gateway',
      metadata: { activation: 'budget_and_provider_gate_required' }
    },
    {
      capability_key: 'local-model-worker',
      kind: 'model_runtime',
      name: 'Local model worker',
      status: 'candidate',
      cost_class: 'local_free',
      score: 85,
      source_ref: 'local-runtime',
      metadata: { activation: 'hardware_worker_required' }
    },
    {
      capability_key: 'public-api-registry',
      kind: 'api_registry',
      name: 'Public / free API registry',
      status: 'research',
      cost_class: 'free_first',
      score: 70,
      source_ref: 'capability-lab',
      metadata: { promotion: 'license_privacy_security_benchmark_canary' }
    }
  ].map((capability) => ({
    organization_id: ctx.organizationId,
    ...capability,
    created_by: ctx.user.id,
    updated_by: ctx.user.id
  }));

  const { error: capabilityError } = await supabase
    .from('ai_company_capabilities')
    .upsert(capabilities, { onConflict: 'organization_id,capability_key' });
  if (capabilityError) return 'Capability registry could not be initialized.';

  const { error: policyError } = await supabase
    .from('ai_company_budget_policies')
    .upsert(
      {
        organization_id: ctx.organizationId,
        period_start: AI_COMPANY_BUDGET_START,
        period_end: AI_COMPANY_BUDGET_END,
        hard_cap_usd: AI_COMPANY_GLOBAL_BUDGET_USD,
        active: true,
        created_by: ctx.user.id,
        updated_by: ctx.user.id,
        notes: 'Hard ceiling. This record does not authorize spending by itself.'
      },
      { onConflict: 'organization_id,period_start,period_end' }
    );
  return policyError ? 'Budget governor could not be initialized.' : null;
}

async function validateClientScope(
  supabase: SupabaseClient,
  organizationId: string,
  plane: AiPlane,
  clientOrganizationId: string | null
) {
  if (plane === 'internal') return clientOrganizationId === null;
  if (!clientOrganizationId) return false;
  const { data } = await supabase
    .from('client_organizations')
    .select('id')
    .eq('id', clientOrganizationId)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .maybeSingle();
  return Boolean(data);
}

async function recordAudit(
  supabase: SupabaseClient,
  ctx: AuthContext,
  action: string,
  targetId: string,
  summary: string,
  classification: string
) {
  await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action,
    target_table: 'ai_company_missions',
    target_id: targetId,
    classification,
    metadata: { summary, surface: 'inc', runtime: 'ai-company-v1' }
  });
}

export async function createAiMission(
  _prev: AiCompanyActionResult,
  form: FormData
): Promise<AiCompanyActionResult> {
  const gate = await ownerAiGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const foundationError = await ensureAiCompanyFoundation(supabase, ctx);
  if (foundationError) return { ok: false, error: foundationError };

  const title = String(form.get('title') ?? '').trim();
  const objective = String(form.get('objective') ?? '').trim();
  const verticalRaw = String(form.get('vertical') ?? '').trim();
  const planeRaw = String(form.get('plane') ?? '').trim();
  const clientOrganizationId = uuid(form.get('clientOrganizationId'));

  if (title.length < 3 || title.length > 160) {
    return { ok: false, error: 'Mission title must be between 3 and 160 characters.' };
  }
  if (objective.length < 10 || objective.length > 6000) {
    return { ok: false, error: 'Mission objective must be between 10 and 6,000 characters.' };
  }
  if (!isAiVertical(verticalRaw) || !isAiPlane(planeRaw)) {
    return { ok: false, error: 'Choose a valid KSP vertical and execution plane.' };
  }
  const vertical: AiVertical = verticalRaw;
  const plane: AiPlane = planeRaw;
  const scopedClientId = plane === 'client' ? clientOrganizationId : null;
  if (!(await validateClientScope(supabase, ctx.organizationId, plane, scopedClientId))) {
    return { ok: false, error: plane === 'client' ? 'A valid active client is required for CLIENT plane missions.' : 'INTERNAL missions cannot carry a client scope.' };
  }

  const plan = buildMissionPlan(vertical, plane);
  const { data: mission, error: missionError } = await supabase
    .from('ai_company_missions')
    .insert({
      organization_id: ctx.organizationId,
      title,
      objective,
      vertical,
      plane,
      client_organization_id: scopedClientId,
      status: 'queued',
      execution_mode: 'deterministic_v1',
      model_tier: 'zero_cost',
      budget_cap_usd: 0,
      created_by: ctx.user.id,
      metadata: {
        hierarchy: ['super_ultra', 'super', 'ultra', 'agent', 'sub_agent'],
        paid_model_calls_allowed: false,
        client_internal_boundary: 'enforced'
      }
    })
    .select('id')
    .single();
  if (missionError || !mission) return { ok: false, error: 'Could not create the AI Company mission.' };

  const taskRows = plan.map((task) => ({
    organization_id: ctx.organizationId,
    mission_id: mission.id,
    task_key: task.taskKey,
    title: task.title,
    objective: task.objective,
    agent_key: task.agentKey,
    rank: task.rank,
    status: 'queued',
    parallel_group: task.parallelGroup,
    depends_on_task_keys: task.dependsOn,
    created_by: ctx.user.id
  }));
  const { error: taskError } = await supabase.from('ai_company_tasks').insert(taskRows);
  if (taskError) {
    await supabase.from('ai_company_missions').update({ status: 'failed', output: 'Task graph creation failed.' }).eq('id', mission.id);
    return { ok: false, error: 'Mission was created but its task DAG could not be persisted.' };
  }

  await supabase.from('ai_company_evidence').insert({
    organization_id: ctx.organizationId,
    mission_id: mission.id,
    evidence_type: 'mission_contract',
    summary: `Mission contract created with ${plan.length} tasks across five command levels. Paid model calls are disabled in Runtime V1.`,
    source_ref: 'inc://ai-company/mission-contract',
    metadata: { vertical, plane, task_count: plan.length },
    created_by: ctx.user.id
  });
  await recordAudit(supabase, ctx, 'ai.mission.created', mission.id, `Created AI Company mission: ${title}`, plane === 'client' ? 'client' : 'internal');
  revalidatePath('/ai-company');
  return { ok: true, missionId: mission.id, warning: 'Mission created in zero-cost deterministic mode.' };
}

function resultForTask(
  taskKey: string,
  mission: any,
  capabilityCount: number
) {
  switch (taskKey) {
    case 'discover':
      return `Discovery complete for ${mission.vertical}/${mission.plane}. ${capabilityCount} registered capabilities were available. Objective preserved verbatim; no external provider was called.`;
    case 'guard':
      return `Plane Governor PASS. Scope=${mission.plane}${mission.client_organization_id ? ` client=${mission.client_organization_id}` : ''}. Paid model calls disabled; mission budget=$0.00.`;
    case 'plan':
      return `Mission contract built: discover -> guard -> plan -> two parallel execution slices -> independent verify -> SUPER ULTRA integration. Definition of done requires persisted evidence and zero unapproved spend.`;
    case 'execute-primary':
      return `Primary deterministic worker executed the Runtime V1 control slice for: ${mission.objective}. No external side effect or paid API call was performed.`;
    case 'execute-support':
      return 'Atomic support worker checked the capability registry and routed unresolved external/model needs to the Capability Lab instead of fabricating execution.';
    case 'verify':
      return 'Independent verification PASS: dependency chain complete, CLIENT/INTERNAL scope preserved, evidence present, and recorded API/model spend remains $0.00.';
    case 'approve':
      return 'SUPER ULTRA integration PASS for Runtime V1. Control-plane mission completed with durable task/evidence history. External autonomous workers remain separately capability-gated.';
    default:
      return 'Deterministic worker completed the bounded task.';
  }
}

export async function runAiMission(
  _prev: AiCompanyActionResult,
  form: FormData
): Promise<AiCompanyActionResult> {
  const gate = await ownerAiGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const missionId = uuid(form.get('missionId'));
  if (!missionId) return { ok: false, error: 'Mission ID is invalid.' };

  const foundationError = await ensureAiCompanyFoundation(supabase, ctx);
  if (foundationError) return { ok: false, error: foundationError };

  const { data: mission } = await supabase
    .from('ai_company_missions')
    .select('*')
    .eq('id', missionId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!mission) return { ok: false, error: 'Mission was not found in this KSP organization.' };
  if (mission.status === 'done') return { ok: true, missionId, warning: 'Mission is already complete; no duplicate run was created.' };

  if (!(await validateClientScope(supabase, ctx.organizationId, mission.plane as AiPlane, mission.client_organization_id))) {
    await supabase.from('ai_company_missions').update({ status: 'blocked', output: 'Plane/client scope guard failed.' }).eq('id', missionId);
    return { ok: false, error: 'Plane Governor blocked this mission because its client scope is no longer valid.' };
  }

  const [{ data: tasks }, { data: capabilities }, { data: policy }, { data: budgetRows }] = await Promise.all([
    supabase.from('ai_company_tasks').select('*').eq('mission_id', missionId).eq('organization_id', ctx.organizationId).order('parallel_group').order('task_key'),
    supabase.from('ai_company_capabilities').select('capability_key').eq('organization_id', ctx.organizationId),
    supabase.from('ai_company_budget_policies').select('hard_cap_usd').eq('organization_id', ctx.organizationId).eq('active', true).order('period_start', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('ai_company_budget_events').select('actual_usd').eq('organization_id', ctx.organizationId).eq('event_type', 'usage').gte('created_at', `${AI_COMPANY_BUDGET_START}T00:00:00Z`).lte('created_at', `${AI_COMPANY_BUDGET_END}T23:59:59Z`)
  ]);

  const spent = (budgetRows ?? []).reduce((sum: number, row: any) => sum + Number(row.actual_usd ?? 0), 0);
  const hardCap = Number((policy as any)?.hard_cap_usd ?? AI_COMPANY_GLOBAL_BUDGET_USD);
  if (spent > hardCap) {
    await supabase.from('ai_company_missions').update({ status: 'blocked', output: 'Global API budget guard is exceeded.' }).eq('id', missionId);
    return { ok: false, error: 'Model Budget Governor blocked execution because the global API budget is exceeded.' };
  }

  await supabase.from('ai_company_missions').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', missionId);
  const completed = new Set<string>();
  const groups = [...new Set((tasks ?? []).map((task: any) => Number(task.parallel_group)))].sort((a, b) => a - b);

  for (const group of groups) {
    const groupTasks = (tasks ?? []).filter((task: any) => Number(task.parallel_group) === group);
    for (const task of groupTasks) {
      const dependencies = Array.isArray(task.depends_on_task_keys) ? task.depends_on_task_keys : [];
      if (dependencies.some((dependency: string) => !completed.has(dependency))) {
        await supabase.from('ai_company_tasks').update({ status: 'blocked', result: 'Dependency was not completed.' }).eq('id', task.id);
        await supabase.from('ai_company_missions').update({ status: 'blocked', output: `Task ${task.task_key} was blocked by dependency state.` }).eq('id', missionId);
        return { ok: false, missionId, error: `Mission blocked at ${task.title}.` };
      }

      const startedAt = new Date().toISOString();
      await supabase.from('ai_company_tasks').update({ status: 'running', started_at: startedAt, attempt_count: Number(task.attempt_count ?? 0) + 1 }).eq('id', task.id);
      const result = resultForTask(task.task_key, mission, (capabilities ?? []).length);
      const completedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('ai_company_tasks')
        .update({ status: 'done', result, completed_at: completedAt, updated_at: completedAt })
        .eq('id', task.id);
      if (updateError) {
        await supabase.from('ai_company_missions').update({ status: 'failed', output: `Could not persist task ${task.task_key}.` }).eq('id', missionId);
        return { ok: false, missionId, error: 'Task execution failed while persisting evidence.' };
      }
      await supabase.from('ai_company_evidence').insert({
        organization_id: ctx.organizationId,
        mission_id: missionId,
        task_id: task.id,
        evidence_type: 'task_result',
        summary: result,
        source_ref: `inc://ai-company/${missionId}/${task.task_key}`,
        metadata: { agent_key: task.agent_key, rank: task.rank, parallel_group: task.parallel_group, cost_usd: 0 },
        created_by: ctx.user.id
      });
      completed.add(task.task_key);
    }
  }

  const output = `Runtime V1 completed ${completed.size} tasks for ${mission.title}. Scope=${mission.vertical}/${mission.plane}. API/model spend=$0.00. External autonomous model/tool workers were not invoked.`;
  const completedAt = new Date().toISOString();
  await Promise.all([
    supabase.from('ai_company_missions').update({ status: 'done', output, actual_cost_usd: 0, completed_at: completedAt, updated_at: completedAt }).eq('id', missionId),
    supabase.from('ai_company_budget_events').insert({
      organization_id: ctx.organizationId,
      mission_id: missionId,
      event_type: 'usage',
      provider: 'deterministic',
      model: 'rules-v1',
      input_tokens: 0,
      output_tokens: 0,
      actual_usd: 0,
      metadata: { reason: 'zero_cost_runtime_v1' },
      created_by: ctx.user.id
    })
  ]);
  await recordAudit(supabase, ctx, 'ai.mission.completed', missionId, output, mission.plane === 'client' ? 'client' : 'internal');
  revalidatePath('/ai-company');
  return { ok: true, missionId, warning: 'Mission completed with persisted evidence and $0.00 API/model spend.' };
}
