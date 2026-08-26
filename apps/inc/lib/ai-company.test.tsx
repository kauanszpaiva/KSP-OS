import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AI_COMPANY_BUDGET_END,
  AI_COMPANY_BUDGET_START,
  AI_COMPANY_GLOBAL_BUDGET_USD,
  AI_VERTICALS,
  buildDefaultAgents,
  buildMissionPlan,
  budgetAvailable
} from './ai-company';

const repoRoot = path.resolve(process.cwd());

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('KSP INC AI Company runtime contract', () => {
  it('builds every vertical with all five command levels and isolated client/internal lanes', () => {
    const agents = buildDefaultAgents();
    expect(agents).toHaveLength(66);
    expect(new Set(agents.map((agent) => agent.rank))).toEqual(
      new Set(['super_ultra', 'super', 'ultra', 'agent', 'sub_agent'])
    );

    for (const vertical of AI_VERTICALS) {
      const scoped = agents.filter((agent) => agent.vertical === vertical.key);
      expect(scoped.some((agent) => agent.agent_key === `${vertical.key}.commander`)).toBe(true);
      expect(scoped.some((agent) => agent.agent_key === `${vertical.key}.client.worker` && agent.plane === 'client')).toBe(true);
      expect(scoped.some((agent) => agent.agent_key === `${vertical.key}.internal.worker` && agent.plane === 'internal')).toBe(true);

      for (const agent of scoped.filter((item) => item.plane === 'client')) {
        expect(agent.parent_agent_key ?? '').not.toContain('.internal.');
      }
      for (const agent of scoped.filter((item) => item.plane === 'internal')) {
        expect(agent.parent_agent_key ?? '').not.toContain('.client.');
      }
    }

    expect(agents.some((agent) => agent.agent_key === 'inc.plane-governor')).toBe(true);
    expect(agents.some((agent) => agent.agent_key === 'inc.capability-lab')).toBe(true);
    expect(agents.some((agent) => agent.agent_key === 'inc.budget-governor')).toBe(true);
  });

  it('turns one mission into a five-stage DAG with a real parallel execution group', () => {
    const plan = buildMissionPlan('dev', 'client');
    expect(plan).toHaveLength(7);
    expect(plan.map((task) => task.parallelGroup)).toEqual([1, 1, 2, 3, 3, 4, 5]);
    expect(plan.find((task) => task.taskKey === 'plan')?.dependsOn).toEqual(['discover', 'guard']);
    expect(plan.find((task) => task.taskKey === 'verify')?.dependsOn).toEqual(['execute-primary', 'execute-support']);
    expect(plan.find((task) => task.taskKey === 'approve')?.rank).toBe('super_ultra');
    expect(plan.find((task) => task.taskKey === 'execute-support')?.rank).toBe('sub_agent');
    expect(plan.filter((task) => task.agentKey.includes('.client.'))).toHaveLength(5);
    expect(plan.some((task) => task.agentKey.includes('.internal.'))).toBe(false);
  });

  it('hard-codes the approved temporary API cash ceiling without turning it into spend', () => {
    expect(AI_COMPANY_GLOBAL_BUDGET_USD).toBe(50);
    expect(AI_COMPANY_BUDGET_START).toBe('2026-08-26');
    expect(AI_COMPANY_BUDGET_END).toBe('2026-09-15');
    expect(budgetAvailable(50, 3.25)).toBe(46.75);
    expect(budgetAvailable(50, 75)).toBe(0);
  });

  it('keeps runtime writes behind KSP INC owner + MFA and paid models disabled in V1', () => {
    const actions = read('apps/inc/app/ai-company/actions.ts');
    expect(actions).toContain('isKspIncOwner(ctx)');
    expect(actions).toContain('if (!ctx.mfa)');
    expect(actions).toContain("execution_mode: 'deterministic_v1'");
    expect(actions).toContain("model_tier: 'zero_cost'");
    expect(actions).toContain("paid_model_calls_allowed: false");
    expect(actions).toContain("actual_usd: 0");
  });

  it('keeps the database anonymous-denied and owner-only by RLS', () => {
    const migration = read('supabase/migrations/20260826123000_ai_company_runtime_v1.sql');
    for (const table of [
      'ai_company_agents',
      'ai_company_missions',
      'ai_company_tasks',
      'ai_company_evidence',
      'ai_company_capabilities',
      'ai_company_budget_policies',
      'ai_company_budget_events'
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on public.${table} from anon`);
    }
    expect(migration).toContain('public.is_executive(ai_company_missions.organization_id)');
    expect(migration).toContain("ai_company_missions.plane = 'internal'");
    expect(migration).toContain("ai_company_missions.plane = 'client'");
    expect(migration).toContain('co.organization_id = ai_company_missions.organization_id');
  });

  it('exposes the AI Company only from the standalone INC owner shell', () => {
    const shell = read('apps/inc/components/inc-shell.tsx');
    const page = read('apps/inc/app/ai-company/page.tsx');
    expect(shell).toContain("['AI Company', '/ai-company']");
    expect(page).toContain('requireIncOwner()');
    expect(page).toContain('getAiCompanyDashboard');
    expect(page).toContain('AiCompanyConsole');
  });
});
