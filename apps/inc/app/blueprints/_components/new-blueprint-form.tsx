"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createBlueprintForm } from "../../blueprints-actions";

const KINDS = [
  { value: "system", label: "System", hint: "Hardware + software architecture" },
  { value: "software", label: "Software", hint: "Applications, services, APIs" },
  { value: "process", label: "Process", hint: "Workflows and operations" },
  { value: "infrastructure", label: "Infrastructure", hint: "Cloud, networks, hosting" },
];

const initialState = { ok: false, error: undefined as string | undefined };

export function NewBlueprintForm({ projects }: { projects: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createBlueprintForm, initialState);

  return (
    <form action={formAction} className="card" style={{ padding: "1.5rem" }}>
      <div className="field">
        <label htmlFor="bp-name">Name</label>
        <input id="bp-name" name="name" required minLength={2} maxLength={160} autoFocus placeholder="e.g. Billing platform" />
      </div>

      <div className="field">
        <label htmlFor="bp-desc">Description</label>
        <textarea id="bp-desc" name="description" rows={4} maxLength={4000} placeholder="What does this blueprint cover? Goals, scope, decisions…" />
      </div>

      <div className="field">
        <label htmlFor="bp-kind">Kind</label>
        <select id="bp-kind" name="kind" defaultValue="system">
          {KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label} — {kind.hint}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="bp-project">Project</label>
        <select id="bp-project" name="projectId" defaultValue="">
          <option value="">No project — standalone</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <p role="alert" className="error" style={{ marginTop: "0.75rem" }}>
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
        <button className="primaryButton" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create blueprint"}
        </button>
        <Link className="textButton" href="/blueprints">
          Cancel
        </Link>
      </div>
    </form>
  );
}
