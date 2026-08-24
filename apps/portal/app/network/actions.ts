'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '../../lib/supabase';
import { requireNetworkSession } from '../../lib/network-session';

export type NetworkActionResult={ok:boolean;error?:string};

export async function respondToAssignment(form:FormData):Promise<NetworkActionResult>{
  await requireNetworkSession();
  const assignmentId=String(form.get('assignmentId')??'').trim();
  const response=String(form.get('response')??'').trim();
  const note=String(form.get('note')??'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(assignmentId)) return {ok:false,error:'Invalid assignment.'};
  if(!['accepted','declined','clarification_requested'].includes(response)) return {ok:false,error:'Invalid response.'};
  const supabase=await getServerSupabase();
  if(!supabase) return {ok:false,error:'KSP Network is not configured.'};
  const {error}=await supabase.rpc('respond_partner_assignment',{p_assignment_id:assignmentId,p_response:response,p_note:note||null});
  if(error) return {ok:false,error:'This assignment could not be updated. Refresh and try again.'};
  revalidatePath('/network');
  return {ok:true};
}
