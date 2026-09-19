import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase, type EmailOtpType } from '../../../lib/supabase';

const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{16,256}$/;
const RECOVERY_PATH = '/account/update-password';
const VALID_OTP_TYPES: EmailOtpType[] = ['recovery', 'signup', 'invite', 'magiclink', 'email', 'email_change'];

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value === '/login') return '/home';
  return value;
}

function invalidRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '?auth=invalid';
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')?.trim() || '';
  const type = (request.nextUrl.searchParams.get('type') || '') as EmailOtpType;
  const nextParam = request.nextUrl.searchParams.get('next');

  if (!TOKEN_HASH_RE.test(tokenHash) || !VALID_OTP_TYPES.includes(type)) {
    return invalidRedirect(request);
  }

  const destination = type === 'recovery' ? RECOVERY_PATH : safeNextPath(nextParam);

  const supabase = await getServerSupabase();
  if (!supabase) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '?auth=unconfigured';
    return NextResponse.redirect(url);
  }

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash
  });

  if (error) return invalidRedirect(request);

  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = '';
  return NextResponse.redirect(url);
}
