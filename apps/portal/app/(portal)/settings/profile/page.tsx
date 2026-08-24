import { getEditableProfile } from '@ksp/auth';
import { Icon, ProfileSettingsForm } from '@ksp/ui';
import { notFound } from 'next/navigation';
import { requirePortalSession } from '../../../../lib/session';
import { getServerSupabase } from '../../../../lib/supabase';
import { updateProfileAction } from './actions';

export default async function PortalProfilePage() {
  const ctx = await requirePortalSession();
  const supabase = await getServerSupabase();
  if (!supabase) notFound();
  const profile = await getEditableProfile(supabase, ctx.user.id);
  if (!profile) notFound();

  return (
    <>
      <header className="mb-6 border-b border-line pb-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">Settings</p>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">Profile</h1>
        <details className="group mt-2 max-w-2xl text-ink-3">
          <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[12px] font-medium marker:hidden hover:text-ink [&::-webkit-details-marker]:hidden">
            About this page
            <Icon name="chevron-down" className="h-3.5 w-3.5 transition-transform duration-fast group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-[13.5px] leading-relaxed">Your identity across requests, approvals, files, meetings, and client conversations.</p>
        </details>
      </header>
      <ProfileSettingsForm value={profile} updateAction={updateProfileAction} />
    </>
  );
}
