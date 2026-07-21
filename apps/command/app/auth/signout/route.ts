import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url));
}
