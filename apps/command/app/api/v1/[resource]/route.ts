import { NextResponse } from 'next/server';
import { createTokenClient, type SupabaseClient } from '@ksp/database';
import { getAuthContext, type AuthContext } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { createDecisionRequestSchema, createMissionSchema, createTaskSchema, postCommentSchema } from '@ksp/validation';
import { getClients, getCommitments, getMissions, getOutcomes, getTasks } from '../../../(app)/data';

/**
 * v1 API for the AI connector (Claude MCP / ChatGPT Actions).
 *
 * Auth: a Supabase user access token in `Authorization: Bearer <token>`. Every
 * request runs as that user through createTokenClient, so table RLS is in force
 * — the connector can never see or do more than the same person can in the app.
 * There is NO service-role path here, and only internal members (an active
 * membership resolved by getAuthContext) are allowed.
 *
 * Reads (GET) cover the live modules. Writes (POST) are restricted to
 * LOW-RISK, reversible, internal actions (create task, add comment, create
 * mission) — the A1/A2 tier per reference/CLAUDE.md. Sensitive/material actions
 * are NOT executed here. Instead the connector can PROPOSE one via
 * `POST /api/v1/proposals`, which files an approval_request a human decides in
 * the Decisions module — the A3 pattern (human approval before anything
 * material happens), with no autonomous execution. See
 * docs/integrations/ai-connector.md.
 */
export const dynamic = 'force-dynamic';

function unauthorized(reason: string) {
  return NextResponse.json({ error: reason }, { status: 401 });
}

function badRequest(reason: string) {
  return NextResponse.json({ error: reason }, { status: 400 });
}

/** Mirror of actions.ts `record()` — dual activity + audit trail for every write. */
async function audit(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string | null,
  summary: string
) {
  await supabase.from('activity_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    verb,
    object_table: objectTable,
    object_id: objectId,
    summary
  });
  await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action: verb,
    target_table: objectTable,
    target_id: objectId,
    classification: 'internal',
    metadata: { summary, via: 'ai_connector' }
  });
}

function firstIssue(error: { issues?: Array<{ message: string }> }): string {
  return error.issues?.[0]?.message ?? 'invalid_input';
}

async function resolve(request: Request): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | NextResponse> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return unauthorized('missing_bearer_token');
  const supabase = createTokenClient(token);
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const ctx = await getAuthContext(supabase);
  if (!ctx) return unauthorized('unauthenticated_or_no_membership');
  return { supabase, ctx };
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const gate = await resolve(request);
  if (gate instanceof NextResponse) return gate;
  const { supabase, ctx } = gate;

  switch (resource) {
    case 'me':
      return NextResponse.json({
        id: ctx.user.id,
        email: ctx.user.email,
        displayName: ctx.user.displayName,
        organizationId: ctx.organizationId,
        roles: ctx.internalRoles
      });
    case 'missions':
      return NextResponse.json({ data: await getMissions(supabase) });
    case 'clients':
      return NextResponse.json({ data: await getClients(supabase) });
    case 'tasks':
      return NextResponse.json({ data: await getTasks(supabase) });
    case 'outcomes':
      return NextResponse.json({ data: await getOutcomes(supabase) });
    case 'commitments':
      return NextResponse.json({ data: await getCommitments(supabase) });
    default:
      return NextResponse.json({ error: 'unknown_resource', allowed: ['me', 'missions', 'clients', 'tasks', 'outcomes', 'commitments'] }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const gate = await resolve(request);
  if (gate instanceof NextResponse) return gate;
  const { supabase, ctx } = gate;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest('invalid_json_body');
  }

  switch (resource) {
    case 'tasks': {
      const parsed = createTaskSchema.safeParse({
        title: body.title,
        projectId: body.projectId || undefined,
        ownerId: body.ownerId || undefined,
        startDate: body.startDate || undefined,
        dueDate: body.dueDate || undefined
      });
      if (!parsed.success) return badRequest(firstIssue(parsed.error));
      const { error, data } = await supabase
        .from('tasks')
        .insert({
          organization_id: ctx.organizationId,
          project_id: parsed.data.projectId ?? null,
          owner_id: parsed.data.ownerId ?? ctx.user.id,
          title: parsed.data.title,
          start_date: parsed.data.startDate || null,
          due_date: parsed.data.dueDate || null
        })
        .select('id')
        .single();
      if (error) return badRequest('could_not_create_task');
      await audit(supabase, ctx, 'task.created', 'tasks', data.id, `Task: ${parsed.data.title}`);
      return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
    }
    case 'comments': {
      const parsed = postCommentSchema.safeParse({ objectTable: body.objectTable, objectId: body.objectId, body: body.body });
      if (!parsed.success) return badRequest(firstIssue(parsed.error));
      const { error, data } = await supabase
        .from('comments')
        .insert({
          organization_id: ctx.organizationId,
          object_table: parsed.data.objectTable,
          object_id: parsed.data.objectId,
          author_id: ctx.user.id,
          body: parsed.data.body
        })
        .select('id')
        .single();
      if (error) return badRequest('could_not_post_comment');
      await audit(supabase, ctx, 'comment.posted', parsed.data.objectTable, parsed.data.objectId, 'Comment added');
      return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
    }
    case 'missions': {
      const decision = canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' });
      if (!decision.allowed) return NextResponse.json({ error: 'not_permitted' }, { status: 403 });
      const parsed = createMissionSchema.safeParse({ name: body.name, projectType: body.projectType, clientId: body.clientId || undefined });
      if (!parsed.success) return badRequest(firstIssue(parsed.error));
      const { error, data } = await supabase
        .from('projects')
        .insert({
          organization_id: ctx.organizationId,
          client_id: parsed.data.clientId ?? null,
          name: parsed.data.name,
          project_type: parsed.data.projectType,
          health: 'unknown',
          status: 'active'
        })
        .select('id')
        .single();
      if (error) return badRequest('could_not_create_mission');
      // The creator must join their own mission or projects RLS hides it from them.
      await supabase.from('project_memberships').insert({
        organization_id: ctx.organizationId,
        project_id: data.id,
        profile_id: ctx.user.id,
        role: ctx.internalRoles[0] ?? 'contractor'
      });
      await audit(supabase, ctx, 'mission.created', 'projects', data.id, `Created mission: ${parsed.data.name}`);
      return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
    }
    case 'proposals': {
      // A3: the connector cannot execute a sensitive/material action — it files
      // an approval request that a human decides in the Decisions module. This
      // is the only way the connector touches anything beyond the low-risk set,
      // and it never auto-executes.
      const parsed = createDecisionRequestSchema.safeParse({
        approvalType: body.approvalType,
        riskLevel: body.riskLevel,
        amountMinor: body.amountMinor || undefined,
        dueAt: body.dueAt || undefined
      });
      if (!parsed.success) return badRequest(firstIssue(parsed.error));
      const { error, data } = await supabase
        .from('approval_requests')
        .insert({
          organization_id: ctx.organizationId,
          requester_id: ctx.user.id,
          approval_type: parsed.data.approvalType,
          risk_level: parsed.data.riskLevel,
          amount_minor: parsed.data.amountMinor ?? null,
          due_at: parsed.data.dueAt || null
        })
        .select('id')
        .single();
      if (error) return badRequest('could_not_create_proposal');
      await audit(supabase, ctx, 'decision.requested', 'approval_requests', data.id, `Proposed for approval: ${parsed.data.approvalType}`);
      return NextResponse.json({ ok: true, id: data.id, status: 'pending_human_approval' }, { status: 201 });
    }
    default:
      return NextResponse.json(
        {
          error: 'unknown_or_unwritable_resource',
          writable: ['tasks', 'comments', 'missions', 'proposals'],
          note: 'Sensitive/material actions are not executed here — use "proposals" to request human approval.'
        },
        { status: 404 }
      );
  }
}
