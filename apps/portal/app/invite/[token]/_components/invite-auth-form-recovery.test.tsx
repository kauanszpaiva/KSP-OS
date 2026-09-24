import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteAuthForm } from './invite-auth-form';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), signIn: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@ksp/database', () => ({ isSupabaseConfigured: () => true, createBrowserClient: () => ({ auth: { signInWithPassword: mocks.signIn }, functions: { invoke: mocks.invoke } }) }));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
function form(mode: 'signin' | 'signup' = 'signin') {
  const view = render(<InviteAuthForm token={'a'.repeat(64)} />);
  if (mode === 'signup') fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'CLIENT@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-test-password' } });
  return view.container.querySelector('form')!;
}
describe('invitation request recovery', () => {
  it.each(['signin', 'signup'] as const)('unlocks %s after a rejected network request', async (mode) => {
    mocks.signIn.mockRejectedValue(new Error('private-network-detail'));
    mocks.invoke.mockRejectedValue(new Error('private-network-detail'));
    const element = form(mode);
    fireEvent.submit(element);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not connect/i));
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
    expect(screen.queryByText(/private-network-detail/)).toBeNull();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('signs in an existing account without calling the signup relay', async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    fireEvent.submit(form());
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.signIn).toHaveBeenCalledWith({ email: 'client@example.invalid', password: 'synthetic-test-password' });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('does not submit a second signup while the first is pending', async () => {
    let finish!: (value: unknown) => void;
    mocks.invoke.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const element = form('signup');
    fireEvent.submit(element);
    fireEvent.submit(element);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ data: { ok: true }, error: null }); });
    expect(screen.getByRole('status').textContent).toMatch(/Check your email/);
  });
});
