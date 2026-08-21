import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase';

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/home';
  return value;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (!code) {
    url.pathname = '/login';
    url.search = '?auth=invalid';
    return NextResponse.redirect(url);
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    url.pathname = '/login';
    url.search = '?auth=unconfigured';
    return NextResponse.redirect(url);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    url.pathname = '/login';
    url.search = '?auth=invalid';
    return NextResponse.redirect(url);
  }

  url.pathname = next;
  url.search = '';
  return NextResponse.redirect(url);
}
