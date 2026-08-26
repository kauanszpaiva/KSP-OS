import { describe, expect, it } from "vitest";
import {
  AGENTS,
  DEPARTMENTS,
  agentsForDepartment,
  resolveAgentWorkState,
  type AgentHandoffSignal,
} from "../app/founder/company/agent-registry";

describe("KSP AI Company registry", () => {
  it("defines exactly 77 unique agent roles across seven departments", () => {
    expect(DEPARTMENTS).toHaveLength(7);
    expect(AGENTS).toHaveLength(77);
    expect(new Set(AGENTS.map((agent) => agent.id)).size).toBe(77);
    expect(
      new Set(AGENTS.map((agent) => agent.codename.toLowerCase())).size,
    ).toBe(77);
    for (const department of DEPARTMENTS)
      expect(agentsForDepartment(department.id)).toHaveLength(11);
  });

  it("locks the requested five-level hierarchy", () => {
    const counts = AGENTS.reduce<Record<string, number>>((result, agent) => {
      result[agent.rank] = (result[agent.rank] ?? 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({
      super_ultra: 7,
      super: 7,
      ultra: 14,
      agent: 14,
      subagent: 35,
    });
  });

  it("gives every non-C-level role a valid parent in the same department", () => {
    const byId = new Map(AGENTS.map((agent) => [agent.id, agent]));
    for (const agent of AGENTS) {
      if (agent.rank === "super_ultra") {
        expect(agent.parentId).toBeNull();
        continue;
      }
      const parent = byId.get(agent.parentId ?? "");
      expect(parent, `${agent.id} is missing a parent`).toBeDefined();
      expect(parent?.departmentId).toBe(agent.departmentId);
    }
  });
});

describe("truthful agent work state", () => {
  const atlas = AGENTS.find((agent) => agent.id === "atlas")!;
  const signal = (
    status: AgentHandoffSignal["status"],
    updated_at = "2026-08-26T12:00:00.000Z",
  ): AgentHandoffSignal => ({
    to_agent: "Atlas",
    status,
    updated_at,
  });

  it("is idle without a matching handoff", () => {
    expect(resolveAgentWorkState(atlas, [])).toBe("idle");
    expect(
      resolveAgentWorkState(atlas, [
        { ...signal("claimed"), to_agent: "Prometheus" },
      ]),
    ).toBe("idle");
  });

  it("only reports work when a real handoff state supports it", () => {
    expect(resolveAgentWorkState(atlas, [signal("draft")])).toBe("queued");
    expect(resolveAgentWorkState(atlas, [signal("ready")])).toBe("queued");
    expect(resolveAgentWorkState(atlas, [signal("blocked")])).toBe("blocked");
    expect(resolveAgentWorkState(atlas, [signal("claimed")])).toBe("working");
  });

  it("limits the recently completed state to 24 hours", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    expect(
      resolveAgentWorkState(
        atlas,
        [signal("done", "2026-08-25T13:00:00.000Z")],
        now,
      ),
    ).toBe("completed_recently");
    expect(
      resolveAgentWorkState(
        atlas,
        [signal("done", "2026-08-25T11:59:59.000Z")],
        now,
      ),
    ).toBe("idle");
  });
});
