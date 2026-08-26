import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase';

const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{16,256}$/;
const RECOVERY_PATH = '/account/update-password';

function invalidRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '?auth=invalid';
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')?.trim() || '';
  const type = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next') || '';

  if (type !== 'recovery' || next !== RECOVERY_PATH || !TOKEN_HASH_RE.test(tokenHash)) {
    return invalidRedirect(request);
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '?auth=unconfigured';
    return NextResponse.redirect(url);
  }

  const { error } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash
  });

  if (error) return invalidRedirect(request);

  const url = request.nextUrl.clone();
  url.pathname = RECOVERY_PATH;
  url.search = '';
  return NextResponse.redirect(url);
}
