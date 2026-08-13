import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import type { SupabaseClient } from '@ksp/database';
import { createTaskSchema } from '@ksp/validation';
import { getClients, getMissions, getTasks } from '../../app/(app)/data';
import { toolContextFromAuth, type McpToolContext } from './context';

/**
 * MCP tools for KSP Command OS.
 *
 * Read tools reuse the RLS-scoped fetchers in `app/(app)/data.ts` — no new
 * query logic, no mock data. Each tool runs under the caller's user-scoped
 * client (see context.ts), so a tool never returns more than the operator could
 * see in the app. Outputs are curated projections (not raw rows) to keep the
 * payload lean and to avoid handing confidential note bodies to an external
 * model by default.
 *
 * The single write tool (`create_task`) mirrors the low-risk A1/A2 write already
 * live at `POST /api/v1/tasks`. It is registered ONLY when
 * `MCP_ENABLE_WRITE_TOOLS === 'true'`; the default build exposes read tools
 * only. Enabling writes is a governed follow-up slice, not a silent default.
 */

type ToolPayload = Record<string, unknown> | Array<unknown>;

interface ToolResult {
  // Index signature so the envelope satisfies the SDK's CallToolResult shape.
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface McpTool<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  /** Returns a JSON-serializable projection; the envelope is added by the registrar. */
  run: (args: Record<string, unknown>, ctx: McpToolContext) => Promise<ToolPayload>;
}

const limitInput = {
  limit: z.number().int().min(1).max(200).optional().describe('Maximum number of records to return (default 50, max 200).')
};

function clampLimit(value: unknown, fallback = 50): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 1), 200) : fallback;
}

/* ------------------------------------------------------------------ Read tools -- */

export const whoamiTool: McpTool = {
  name: 'whoami',
  title: 'Who am I',
  description:
    'Return the identity the connector is acting as: the KSP internal member, their organization, and internal roles. Use this to confirm the connection is authenticated before calling other tools.',
  inputSchema: {},
  run: async (_args, ctx) => ({
    userId: ctx.identity.userId,
    email: ctx.identity.email,
    displayName: ctx.identity.displayName,
    organizationId: ctx.identity.organizationId,
    roles: ctx.identity.roles
  })
};

export const listMissionsTool: McpTool = {
  name: 'list_missions',
  title: 'List missions',
  description:
    'List missions (projects) the current member can see in KSP Command OS, most recent first. Returns id, name, type, status, health, linked client name, and milestone/member counts. Use this to get an operational overview of active work or to find a mission id for follow-up questions.',
  inputSchema: { ...limitInput },
  run: async (args, ctx) => {
    const limit = clampLimit(args.limit);
    const missions = await getMissions(ctx.supabase);
    return missions.slice(0, limit).map((m) => ({
      id: m.id,
      name: m.name,
      projectType: m.project_type,
      status: m.status,
      health: m.health,
      clientName: m.clientName,
      milestoneCount: m.milestones.length,
      memberCount: m.memberIds.length,
      createdAt: m.created_at
    }));
  }
};

export const listTasksTool: McpTool = {
  name: 'list_tasks',
  title: 'List tasks',
  description:
    'List workspace tasks the current member can see, most recent first. Optionally filter by status. Returns id, title, status, blocked flag, owner name, project name, and dates. Use this to review workload or find a task id.',
  inputSchema: {
    status: z.enum(['active', 'archived']).optional().describe('Filter to tasks with this status. Omit for all statuses.'),
    ...limitInput
  },
  run: async (args, ctx) => {
    const limit = clampLimit(args.limit);
    const status = args.status as 'active' | 'archived' | undefined;
    const tasks = await getTasks(ctx.supabase);
    return tasks
      .filter((t) => (status ? t.status === status : true))
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        blocked: t.blocked,
        ownerName: t.ownerName,
        projectName: t.projectName,
        startDate: t.start_date,
        dueDate: t.due_date,
        createdAt: t.created_at
      }));
  }
};

export const listClientsTool: McpTool = {
  name: 'list_clients',
  title: 'List clients',
  description:
    'List client organizations the current member can see, most recent first. Returns id, display name, status, relationship health, contacts (name and email), and a count of internal notes (bodies are not included). Use this to look up a client or its contacts.',
  inputSchema: { ...limitInput },
  run: async (args, ctx) => {
    const limit = clampLimit(args.limit);
    const clients = await getClients(ctx.supabase);
    return clients.slice(0, limit).map((c) => ({
      id: c.id,
      displayName: c.display_name,
      status: c.status,
      relationshipHealth: c.relationship_health,
      contacts: c.contacts.map((contact) => ({ name: contact.name, email: contact.email })),
      noteCount: c.notes.length,
      createdAt: c.created_at
    }));
  }
};

export const readTools: McpTool[] = [whoamiTool, listMissionsTool, listTasksTool, listClientsTool];

/* ----------------------------------------------------------------- Write tools -- */

/** Mirror of the v1 connector's dual activity + audit trail for every write. */
async function audit(
  supabase: SupabaseClient,
  ctx: McpToolContext,
  verb: string,
  objectTable: string,
  objectId: string | null,
  summary: string
): Promise<void> {
  await supabase.from('activity_events').insert({
    organization_id: ctx.identity.organizationId,
    actor_id: ctx.identity.userId,
    verb,
    object_table: objectTable,
    object_id: objectId,
    summary
  });
  await supabase.from('audit_events').insert({
    organization_id: ctx.identity.organizationId,
    actor_id: ctx.identity.userId,
    action: verb,
    target_table: objectTable,
    target_id: objectId,
    classification: 'internal',
    metadata: { summary, via: 'mcp_connector' }
  });
}

/**
 * A1/A2 low-risk write, mirroring `POST /api/v1/tasks`: validated with the
 * shared schema, executed under the caller's token (RLS in force), audited, and
 * it returns explicitly what was created. Sensitive/material actions are NOT
 * exposed here — those stay human-gated (A3) per the blueprint. Registered only
 * behind `MCP_ENABLE_WRITE_TOOLS`.
 */
export const createTaskTool: McpTool = {
  name: 'create_task',
  title: 'Create task',
  description:
    'Create a workspace task in KSP Command OS. Low-risk, reversible, and audited. Returns the new task id and the fields that were written. Only enabled when write tools are turned on for this deployment.',
  inputSchema: {
    title: z.string().min(2).max(200).describe('Task title (2-200 characters).'),
    projectId: z.string().uuid().optional().describe('Optional mission/project id to attach the task to.'),
    ownerId: z.string().uuid().optional().describe('Optional owner profile id; defaults to the calling member.'),
    startDate: z.string().optional().describe('Optional start date (YYYY-MM-DD).'),
    dueDate: z.string().optional().describe('Optional due date (YYYY-MM-DD).')
  },
  run: async (args, ctx) => {
    const parsed = createTaskSchema.safeParse({
      title: args.title,
      projectId: args.projectId || undefined,
      ownerId: args.ownerId || undefined,
      startDate: args.startDate || undefined,
      dueDate: args.dueDate || undefined
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' };
    }
    const written = {
      organization_id: ctx.identity.organizationId,
      project_id: parsed.data.projectId ?? null,
      owner_id: parsed.data.ownerId ?? ctx.identity.userId,
      title: parsed.data.title,
      start_date: parsed.data.startDate || null,
      due_date: parsed.data.dueDate || null
    };
    const { error, data } = await ctx.supabase.from('tasks').insert(written).select('id').single();
    if (error || !data) {
      return { ok: false, error: 'could_not_create_task' };
    }
    await audit(ctx.supabase, ctx, 'task.created', 'tasks', data.id, `Task: ${parsed.data.title}`);
    return { ok: true, id: data.id, created: written };
  }
};

/** True when write tools are explicitly enabled for this deployment. */
export function writeToolsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.MCP_ENABLE_WRITE_TOOLS === 'true';
}

/* ------------------------------------------------------------------- Registrar -- */

function toEnvelope(payload: ToolPayload): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function errorEnvelope(message: string): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }], isError: true };
}

/**
 * Register all enabled tools on an McpServer. Each handler resolves the
 * user-scoped context from the request's AuthInfo, so a missing/expired auth
 * fails closed inside the tool as well as at the transport layer.
 */
export function registerTools(server: McpServer, env: Record<string, string | undefined> = process.env): void {
  const tools = writeToolsEnabled(env) ? [...readTools, createTaskTool] : readTools;

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { title: tool.title, description: tool.description, inputSchema: tool.inputSchema },
      async (args: Record<string, unknown>, extra: { authInfo?: import('@modelcontextprotocol/sdk/server/auth/types.js').AuthInfo }) => {
        const ctx = toolContextFromAuth(extra.authInfo);
        if (!ctx) return errorEnvelope('unauthenticated');
        try {
          const payload = await tool.run(args ?? {}, ctx);
          return toEnvelope(payload);
        } catch {
          return errorEnvelope(`tool_failed:${tool.name}`);
        }
      }
    );
  }
}
