import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteAuthForm } from './invite-auth-form';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), signIn: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@ksp/database', () => ({
  isSupabaseConfigured: () => true,
  createBrowserClient: () => ({ auth: { signInWithPassword: mocks.signIn }, functions: { invoke: mocks.invoke } })
}));

afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

function signupForm() {
  const view = render(<InviteAuthForm token={'a'.repeat(64)} />);
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'client@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-test-password' } });
  return view.container.querySelector('form')!;
}

describe('portal invitation signup regression', () => {
  it('reports a missing signup service as unavailable, not as a password mistake', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response('{}', { status: 404 }) } });
    fireEvent.submit(signupForm());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/temporarily unavailable/i));
    expect(screen.queryByText(/Check your email to confirm/)).toBeNull();
  });

  it('provides specific guidance for an invalid or mismatched invitation', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: {
      context: new Response(JSON.stringify({ error: 'invitation_not_available' }), { status: 400 })
    } });
    fireEvent.submit(signupForm());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/expired|no longer available/i));
    expect(screen.getByRole('alert').textContent).toMatch(/exact email/i);
  });

  it('does not apply new-account password length rules to existing-account login', () => {
    render(<InviteAuthForm token={'a'.repeat(64)} />);
    expect(screen.getByLabelText('Password').getAttribute('minlength')).toBeNull();
  });

  it('locks the mode and inputs while signup is pending and unlocks after completion', async () => {
    let finish!: (value: unknown) => void;
    mocks.invoke.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    fireEvent.submit(signupForm());
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(true);
    await act(async () => { finish({ data: { ok: true, requires_confirmation: true }, error: null }); });
    expect(screen.getByRole('status').textContent).toContain('Check your email');
    expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
  });

  it('never renders raw provider error content', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(
      JSON.stringify({ error: 'unexpected', message: 'private-provider-detail' }), { status: 500 }
    ) } });
    fireEvent.submit(signupForm());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(/private-provider-detail/)).toBeNull();
  });

  it('requires a boolean success from the service', async () => {
    mocks.invoke.mockResolvedValue({ data: { ok: 'true' }, error: null });
    fireEvent.submit(signupForm());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(/Check your email to confirm/)).toBeNull();
  });
});
