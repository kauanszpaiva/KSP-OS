'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient,isSupabaseConfigured } from '@ksp/database';

export default function NetworkLogin(){
 const router=useRouter(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState<string|null>(null); const [pending,setPending]=useState(false); const configured=isSupabaseConfigured();
 async function submit(e:React.FormEvent){e.preventDefault();setError(null);const supabase=createBrowserClient();if(!supabase){setError('KSP Network is not configured.');return;}setPending(true);const {error:signInError}=await supabase.auth.signInWithPassword({email,password});setPending(false);if(signInError){setError('Invalid email or password.');return;}router.push('/network');router.refresh();}
 return <main className="flex min-h-screen items-center justify-center bg-canvas px-4"><div className="w-full max-w-sm"><div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">KSP Network</p><h1 className="mt-1 text-2xl font-semibold text-ink">Partner sign in</h1><p className="mt-1 text-sm text-muted">Invite-only access for KSP partners and subcontractors.</p></div><form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-card"><label className="block text-xs font-medium text-ink-2">Email<input className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-sm" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-xs font-medium text-ink-2">Password<input className="mt-1.5 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-sm" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="text-sm text-risk">{error}</p>}<button disabled={!configured||pending} className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand disabled:opacity-50">{pending?'Signing in…':'Sign in'}</button></form></div></main>;
}
