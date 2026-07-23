import { NextResponse } from 'next/server';
import { createTokenClient } from '@ksp/database';
import { getAuthContext } from '@ksp/auth';
import { getClients, getCommitments, getMissions, getOutcomes, getTasks } from '../../../(app)/data';

/**
 * Read-only v1 API for the AI connector (Claude MCP / ChatGPT Actions).
 *
 * Auth: a Supabase user access token in `Authorization: Bearer <token>`. The
 * request runs as that user through createTokenClient, so every table's RLS is
 * in force — this endpoint can never return more than the same person sees in
 * the app. There is NO service-role path here. Only internal members (an active
 * organization membership resolved by getAuthContext) are allowed.
 *
 * This surface is deliberately read-only. Write/"do things" tools are a
 * governed follow-up: per reference/CLAUDE.md, external/material actions are
 * A3 (explicit human approval per action) and must go through the full
 * Integration Standard — see docs/integrations/ai-connector.md.
 */
export const dynamic = 'force-dynamic';

function unauthorized(reason: string) {
  return NextResponse.json({ error: reason }, { status: 401 });
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;

  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return unauthorized('missing_bearer_token');

  const supabase = createTokenClient(token);
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const ctx = await getAuthContext(supabase);
  if (!ctx) return unauthorized('unauthenticated_or_no_membership');

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
