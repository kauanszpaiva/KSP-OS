import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase';
import { readSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const authorizationId = String(form.get('authorizationId') ?? '').trim();
  const decision = String(form.get('decision') ?? '').trim();

  if (!authorizationId || authorizationId.length > 2048 || !['approve', 'deny'].includes(decision)) {
    return NextResponse.json({ error: 'invalid_authorization_request' }, { status: 400 });
  }

  const session = await readSession();
  if (!session.configured) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  if (!session.context) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!session.context.internalRoles.includes('founder_ceo')) {
    return NextResponse.json({ error: 'founder_only' }, { status: 403 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const result = decision === 'approve'
    ? await supabase.auth.oauth.approveAuthorization(authorizationId)
    : await supabase.auth.oauth.denyAuthorization(authorizationId);

  if (result.error || !result.data?.redirect_url) {
    return NextResponse.json({ error: result.error?.message ?? 'authorization_failed' }, { status: 400 });
  }

  // Consent is a single-use POST. A 303 enforces Post/Redirect/Get so the
  // browser follows the OAuth callback with GET instead of replaying this POST.
  return NextResponse.redirect(result.data.redirect_url, { status: 303 });
}
