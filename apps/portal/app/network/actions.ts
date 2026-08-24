'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '../../lib/supabase';
import { requireNetworkSession } from '../../lib/network-session';

export async function respondToAssignment(form:FormData):Promise<void>{
  await requireNetworkSession();
  const assignmentId=String(form.get('assignmentId')??'').trim();
  const response=String(form.get('response')??'').trim();
  const note=String(form.get('note')??'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(assignmentId)) return;
  if(!['accepted','declined','clarification_requested'].includes(response)) return;
  const supabase=await getServerSupabase();
  if(!supabase) return;
  const {error}=await supabase.rpc('respond_partner_assignment',{p_assignment_id:assignmentId,p_response:response,p_note:note||null});
  if(error) return;
  revalidatePath('/network');
}
