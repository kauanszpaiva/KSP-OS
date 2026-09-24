'use client';

import { useActionState } from 'react';
import { createAiMission, runAiMission, type AiCompanyActionResult } from '../app/ai-company/actions';
import { AI_VERTICALS, type AiCompanyDashboard } from '../lib/ai-company';
import { distribution } from '../lib/visual-data';
import {
  DistributionBars,
  Meter,
  Panel,
  StatCard,
  StatGrid,
  VisualGrid
} from './visual-data';

const initial: AiCompanyActionResult = { ok: false };

function Result({ state }: { state: AiCompanyActionResult }) {
  if (state.ok) {
    return <p className="formResult ok">Saved.{state.warning ? ` ${state.warning}` : ''}</p>;
  }
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function taskStatusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

export function AiCompanyConsole({ data }: { data: AiCompanyDashboard }) {
  const [createState, createAction, creating] = useActionState(createAiMission, initial);
  const [runState, runAction, running] = useActionState(runAiMission, initial);

  if (!data.schemaReady) {
    return (
      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Runtime foundation</small><h3>Database migration required</h3></div>
          <span>Fail closed</span>
        </div>
        <p className="adminHint">The standalone app is ready for the AI Company route, but the owner-only runtime tables have not been promoted to this Supabase environment yet.</p>
      </section>
    );
  }

  const tasksByMission = new Map<string, any[]>();
  for (const task of data.tasks) {
    const current = tasksByMission.get(task.mission_id) ?? [];
    current.push(task);
    tasksByMission.set(task.mission_id, current);
  }
  const evidenceByMission = new Map<string, any[]>();
  for (const evidence of data.evidence) {
    const current = evidenceByMission.get(evidence.mission_id) ?? [];
    current.push(evidence);
    evidenceByMission.set(evidence.mission_id, current);
  }

  const missionMix = distribution(data.missions.map((mission) => mission.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const taskMix = distribution(data.tasks.map((task) => task.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const capabilityMix = distribution(data.capabilities.map((capability) => capability.status));

  return (
    <div className="adminStack">
      <section className="section" aria-label="AI Company runtime metrics">
        <StatGrid label="AI Company runtime metrics">
          <StatCard icon="ai" index={0} label="Registered workforce" note="Agent contracts in the runtime" value={data.agents.length} />
          <StatCard icon="target" index={1} label="Mission ledger" note="Missions recorded for this organization" value={data.missions.length} />
          <StatCard icon="banknote" index={2} label="Model/API spend" note={`Through ${data.budget.end}`} valueText={money(data.budget.spent)} />
          <StatCard icon="lock" index={3} label="Ceiling remaining" note={`Of ${money(data.budget.hardCap)} hard ceiling`} valueText={money(data.budget.available)} />
        </StatGrid>
        <div className="visualGrid visualGridSpaced">
          <Panel index={0} note="Hard ceiling, not automatic spending permission" title="Budget governor">
            <Meter
              detail={`${money(data.budget.spent)} committed of a ${money(data.budget.hardCap)} ceiling between ${data.budget.start} and ${data.budget.end}.`}
              label="Ceiling used"
              max={data.budget.hardCap}
              tone={data.budget.spent > 0 ? 'warning' : 'ok'}
              value={data.budget.spent}
            />
          </Panel>
          <Panel index={1} note="Mission status across the returned ledger" title="Mission status">
            <DistributionBars emptyLabel="No missions have been created yet." items={missionMix} />
          </Panel>
          <Panel index={2} note="Task status across every returned mission" title="Task status">
            <DistributionBars emptyLabel="No mission tasks were returned." items={taskMix} />
          </Panel>
          <Panel index={3} note="Capability status across the registered catalog" title="Capability lab">
            <DistributionBars emptyLabel="No capabilities were returned." items={capabilityMix} tone="scale" />
          </Panel>
        </div>
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>SUPER ULTRA intake</small><h3>Create a mission from one sentence</h3></div>
          <span>Zero-cost Runtime V1</span>
        </div>
        <form action={createAction} className="adminForm workTaskForm">
          <label>Vertical
            <select name="vertical" defaultValue="inc" required>
              {AI_VERTICALS.map((vertical) => <option key={vertical.key} value={vertical.key}>{vertical.label}</option>)}
            </select>
          </label>
          <label>Plane
            <select name="plane" defaultValue="internal" required>
              <option value="internal">INTERNAL — KSP private operations</option>
              <option value="client">CLIENT — client-scoped delivery</option>
            </select>
          </label>
          <label>Client scope
            <select name="clientOrganizationId" defaultValue="">
              <option value="">None / INTERNAL</option>
              {data.clients.map((client) => <option key={client.id} value={client.id}>{client.display_name}</option>)}
            </select>
          </label>
          <label className="wideField">Mission title<input name="title" minLength={3} maxLength={160} placeholder="Launch client onboarding intelligence" required /></label>
          <label className="wideField">One-sentence objective<textarea name="objective" minLength={10} maxLength={6000} placeholder="Audit the onboarding flow, find the gaps, create the execution plan, validate it and return evidence." required /></label>
          <button disabled={creating} type="submit">{creating ? 'Building hierarchy…' : 'Create mission & DAG'}</button>
          <Result state={createState} />
        </form>
        <p className="adminFootnote">CLIENT missions require an explicit client scope. INTERNAL missions reject client IDs. Runtime V1 never sends data to a paid/free external model and records $0.00 model/API usage.</p>
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Budget Governor</small><h3>{data.budget.start} → {data.budget.end}</h3></div>
          <span>{money(data.budget.spent)} / {money(data.budget.hardCap)}</span>
        </div>
        <p className="adminHint">The ${data.budget.hardCap.toFixed(0)} amount is a hard ceiling, not automatic spending permission. Runtime V1 is pinned to deterministic zero-cost execution. Provider adapters remain capability-gated.</p>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2>Capability Lab</h2>
          <p>Research → sandbox → benchmark → canary → promote</p>
        </div>
        <div className="ownerList">
          {data.capabilities.map((capability) => (
            <article className="ownerListRow" key={capability.capability_key}>
              <div>
                <strong>{capability.name}</strong>
                <span>{capability.kind} · {capability.status} · {capability.cost_class}</span>
              </div>
              <small>score {capability.score}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2>Mission control</h2>
          <p>Durable DAG · evidence required · newest first</p>
        </div>
        {data.missions.length === 0 ? (
          <div className="emptyPanel">No AI Company missions have been created yet.</div>
        ) : (
          <div className="adminStack">
            {data.missions.map((mission) => {
              const missionTasks = tasksByMission.get(mission.id) ?? [];
              const missionEvidence = evidenceByMission.get(mission.id) ?? [];
              const done = missionTasks.filter((task) => task.status === 'done').length;
              return (
                <article className="adminPanel" key={mission.id}>
                  <div className="adminPanelHeader">
                    <div>
                      <small>{String(mission.vertical).toUpperCase()} · {String(mission.plane).toUpperCase()} · {mission.execution_mode}</small>
                      <h3>{mission.title}</h3>
                    </div>
                    <span>{mission.status}</span>
                  </div>
                  <p className="adminHint">{mission.objective}</p>
                  <div className="ownerList">
                    {missionTasks.map((task) => (
                      <article className="ownerListRow" key={task.id}>
                        <div>
                          <strong>{task.parallel_group}. {task.title}</strong>
                          <span>{task.rank} · {task.agent_key} · {taskStatusLabel(task.status)}</span>
                          {task.result ? <span>{task.result}</span> : null}
                        </div>
                        <small>{task.depends_on_task_keys?.length ? `after ${task.depends_on_task_keys.join(', ')}` : 'parallel start'}</small>
                      </article>
                    ))}
                  </div>
                  <Meter
                    detail={`${missionEvidence.length} evidence records · Model tier ${mission.model_tier} · Cost ${money(Number(mission.actual_cost_usd ?? 0))}`}
                    index={0}
                    label="Task progress"
                    max={missionTasks.length}
                    tone={mission.status === 'done' ? 'ok' : 'neutral'}
                    value={done}
                  />
                  {mission.output ? <p className="formResult ok">{mission.output}</p> : null}
                  {mission.status !== 'done' ? (
                    <form action={runAction} className="adminForm horizontalForm">
                      <input name="missionId" type="hidden" value={mission.id} />
                      <button disabled={running} type="submit">{running ? 'Executing…' : 'Run mission now'}</button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
        <Result state={runState} />
      </section>
    </div>
  );
}
