import { getEditableProfile } from '@ksp/auth';
import { ProfileSettingsForm } from '@ksp/ui';
import { notFound } from 'next/navigation';
import { requireSession } from '../../../../lib/session';
import { getServerSupabase } from '../../../../lib/supabase';
import { PageHeader } from '../../_components/ui';
import { updateProfileAction } from './actions';

export default async function CommandProfilePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  if (!supabase) notFound();
  const profile = await getEditableProfile(supabase, ctx.user.id);
  if (!profile) notFound();

  return (
    <>
      <PageHeader eyebrow="Settings" title="Profile" description="Your identity across Command, comments, notifications, meetings, and the collaboration workspace." />
      <ProfileSettingsForm value={profile} updateAction={updateProfileAction} />
    </>
  );
}
