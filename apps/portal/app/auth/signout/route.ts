import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase';

async function handleSignOut(request: Request) {
  const supabase = await getServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: Request) {
  return handleSignOut(request);
}

export async function GET(request: Request) {
  return handleSignOut(request);
}
