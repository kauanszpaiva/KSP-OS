'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Avatar, cx } from './primitives';
import { useActionToast } from './toast';

export interface ProfileSettingsValue {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  phoneE164: string;
  phoneVerified: boolean;
  timezone: string;
  locale: 'en-US' | 'pt-BR';
  smsOptIn: boolean;
}

export interface ProfileActionState {
  ok: boolean;
  error?: string;
}

type ProfileAction = (state: ProfileActionState, form: FormData) => Promise<ProfileActionState>;

const FIELD =
  'mt-1.5 h-11 w-full rounded-xl border border-line-2 bg-surface px-3 text-sm text-ink transition-[border-color,box-shadow] duration-fast focus:border-brand focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3';

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/Lisbon',
  'UTC'
];

export function ProfileSettingsForm({ value, updateAction }: { value: ProfileSettingsValue; updateAction: ProfileAction }) {
  const [state, action, pending] = useActionState(updateAction, { ok: false });
  const [previewUrl, setPreviewUrl] = useState(value.avatarUrl);
  const objectUrl = useRef<string | null>(null);
  useActionToast(state, 'Profile updated');

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  const timezones = COMMON_TIMEZONES.includes(value.timezone) ? COMMON_TIMEZONES : [value.timezone, ...COMMON_TIMEZONES];

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.55fr)]">
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <Avatar name={value.displayName} imageUrl={previewUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <label htmlFor="avatar" className="inline-flex cursor-pointer items-center rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand shadow-card transition-transform duration-fast active:scale-[0.98]">
              Choose photo
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
                const file = event.target.files?.[0];
                objectUrl.current = file ? URL.createObjectURL(file) : null;
                setPreviewUrl(objectUrl.current ?? value.avatarUrl);
              }}
            />
            <details className="group mt-2 text-[12px] text-ink-3">
              <summary className="cursor-pointer select-none marker:hidden hover:text-ink [&::-webkit-details-marker]:hidden">Photo limits</summary>
              <p className="mt-1 leading-relaxed">JPG, PNG or WebP, up to 5 MB. The original stays private.</p>
            </details>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-[12px] font-medium text-ink-2 sm:col-span-2">
            Name
            <input name="displayName" required minLength={2} maxLength={120} defaultValue={value.displayName} className={FIELD} />
          </label>
          <label className="block text-[12px] font-medium text-ink-2 sm:col-span-2">
            Email
            <input value={value.email} readOnly disabled className={FIELD} />
          </label>
          <label className="block text-[12px] font-medium text-ink-2">
            Language
            <select name="locale" defaultValue={value.locale} className={FIELD}>
              <option value="en-US">English</option>
              <option value="pt-BR">Português</option>
            </select>
          </label>
          <label className="block text-[12px] font-medium text-ink-2">
            Time zone
            <select name="timezone" defaultValue={value.timezone} className={FIELD}>
              {timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone.replace('_', ' ')}</option>)}
            </select>
          </label>
        </div>
      </section>

      <aside className="self-start rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Phone notifications</h2>
        <label className="mt-4 block text-[12px] font-medium text-ink-2">
          Mobile number
          <input name="phoneE164" inputMode="tel" placeholder="+14075550123" defaultValue={value.phoneE164} className={FIELD} />
        </label>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <input
            id="smsOptIn"
            name="smsOptIn"
            type="checkbox"
            defaultChecked={value.smsOptIn}
            disabled={!value.phoneVerified}
            className="mt-0.5 h-4 w-4 rounded border-line-2 text-brand focus:ring-brand"
          />
          <label htmlFor="smsOptIn" className={cx('text-[13px] font-medium', value.phoneVerified ? 'text-ink-2' : 'text-ink-3')}>
            Receive SMS alerts
          </label>
        </div>
        <details className="group mt-3 text-[12px] text-ink-3">
          <summary className="cursor-pointer select-none marker:hidden hover:text-ink [&::-webkit-details-marker]:hidden">Verification status</summary>
          <p className="mt-1.5 leading-relaxed">
            {value.phoneVerified ? 'Phone verified. You can enable or disable SMS.' : 'Save the number now. SMS stays disabled until the number is verified.'}
          </p>
        </details>

        {!state.ok && state.error && <p role="alert" className="mt-4 rounded-xl bg-risk-tint px-3 py-2.5 text-[13px] text-risk">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 h-11 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast hover:bg-brand-strong active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </aside>
    </form>
  );
}
