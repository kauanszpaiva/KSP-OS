'use client';

import { useActionState } from 'react';
import type { IncAdminProject, IncAdminUnit } from '../lib/inc-admin-data';
import { createBusinessUnit, setProjectBusinessUnit, type IncAccessActionResult } from '../app/access/actions';

const initial: IncAccessActionResult = { ok: false };

function Result({ state }: { state: IncAccessActionResult }) {
  if (state.ok) return <p className="formResult ok">Saved.</p>;
  if (state.error) return <p className="formResult error">{state.error}</p>;
  return null;
}

export function StructureAdminPanel({
  units,
  projects,
  available
}: {
  units: IncAdminUnit[];
  projects: IncAdminProject[];
  available: boolean;
}) {
  const [createState, createAction, createPending] = useActionState(createBusinessUnit, initial);
  const [classifyState, classifyAction, classifyPending] = useActionState(setProjectBusinessUnit, initial);
  const unclassified = projects.filter((project) => !project.businessUnitId);

  if (!available) {
    return <div className="emptyPanel">Business-unit schema is not promoted in this environment yet.</div>;
  }

  return (
    <div className="adminStack">
      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Operating model</small><h3>KSP divisions</h3></div>
          <span>{units.length} active</span>
        </div>
        <div className="unitChips">{units.map((unit) => <span key={unit.id}>{unit.name} · {unit.key}</span>)}</div>
        <form action={createAction} className="adminForm horizontalForm">
          <label>Name<input name="name" placeholder="KSP Experiences" required /></label>
          <label>Key<input name="key" placeholder="experiences" required /></label>
          <label>Focus<input name="focus" placeholder="What this division owns" /></label>
          <button disabled={createPending} type="submit">{createPending ? 'Creating…' : 'Create division'}</button>
          <Result state={createState} />
        </form>
      </section>

      <section className="adminPanel">
        <div className="adminPanelHeader">
          <div><small>Project boundary</small><h3>Classify legacy projects</h3></div>
          <span>{unclassified.length} unclassified</span>
        </div>
        {projects.length > 0 && units.length > 0 ? (
          <form action={classifyAction} className="adminForm horizontalForm">
            <label>Project<select name="projectId" required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.businessUnitId ? ' · classified' : ' · unclassified'}</option>)}</select></label>
            <label>Division<select name="businessUnitId" required>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <button disabled={classifyPending} type="submit">{classifyPending ? 'Classifying…' : 'Assign project to division'}</button>
            <Result state={classifyState} />
          </form>
        ) : <p className="adminHint">No project/division pairs are available.</p>}
        <p className="adminFootnote">Project classification is structural. The database independently restricts business-unit reassignment to global owners and automatically preserves legitimate current members during rollout.</p>
      </section>
    </div>
  );
}
