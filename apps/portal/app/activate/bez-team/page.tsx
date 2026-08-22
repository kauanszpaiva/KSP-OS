'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BezTeamActivationPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Informe o código de ativação.');
      return;
    }
    if (!password || password !== confirm) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/activate/bez-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password, confirm })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? 'Não foi possível criar o acesso.');
        return;
      }

      router.replace('/login?activated=1');
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao serviço de ativação.');
    } finally {
      setPending(false);
    }
  }

  const field =
    'mt-1 w-full rounded-lg border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-fast focus:border-brand focus:outline-none focus:shadow-focus';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md animate-fade-slide-up">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
              <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-ink">KSP</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Client Portal</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">BEZ Group</p>
          <h1 className="mt-2 font-display text-[22px] font-semibold text-ink">Ativar acesso BEZ TEAM</h1>
          <p className="mt-2 text-[13px] leading-5 text-ink-3">
            Use o código de ativação fornecido pela KSP e escolha a senha deste acesso compartilhado.
          </p>

          <div className="mt-5 rounded-lg border border-line bg-canvas px-3.5 py-3 text-[13px] text-ink-2">
            <p><span className="font-medium text-ink">Login:</span> bezteam@bezgroup.com</p>
            <p className="mt-1"><span className="font-medium text-ink">Escopo:</span> BEZ Group · visualização de cliente</p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="token" className="block text-[12px] font-medium text-ink-2">Código de ativação</label>
              <input id="token" type="text" required autoComplete="off" autoCapitalize="none" spellCheck={false} value={token} onChange={(e) => setToken(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="password" className="block text-[12px] font-medium text-ink-2">Senha</label>
              <input id="password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-[12px] font-medium text-ink-2">Confirmar senha</label>
              <input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
            </div>

            {error && <p className="rounded-lg border border-risk/25 bg-risk-tint px-3 py-2 text-[13px] text-risk">{error}</p>}

            <button type="submit" disabled={pending} className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast hover:bg-brand-strong active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
              {pending ? 'Criando acesso…' : 'Criar acesso'}
            </button>
          </form>

          <p className="mt-4 text-[12px] leading-5 text-ink-3">
            Sua senha é enviada diretamente para o serviço de autenticação e não é armazenada no KSP AI Command Center.
          </p>
        </div>
      </div>
    </main>
  );
}
