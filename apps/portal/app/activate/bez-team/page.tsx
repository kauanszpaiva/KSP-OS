import Link from 'next/link';

export default function BezTeamActivationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md animate-fade-slide-up">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-on-brand shadow-card">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
              <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 8l-3.5 4L14 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-ink">KSP</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Client Portal</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">BEZ Group</p>
          <h1 className="mt-2 font-display text-[22px] font-semibold text-ink">Acesso BEZ TEAM já ativado</h1>
          <p className="mt-2 text-[13px] leading-5 text-ink-3">
            O fluxo de ativação inicial foi concluído e está permanentemente encerrado. Nenhum novo usuário pode ser criado por esta rota.
          </p>

          <div className="mt-5 rounded-lg border border-line bg-canvas px-3.5 py-3 text-[13px] text-ink-2">
            <p><span className="font-medium text-ink">Login:</span> bezteam@bezgroup.com</p>
            <p className="mt-1"><span className="font-medium text-ink">Status:</span> acesso inicial consumido</p>
          </div>

          <Link
            href="/login"
            className="mt-6 block w-full rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast hover:bg-brand-strong active:scale-[0.98]"
          >
            Ir para o login
          </Link>

          <p className="mt-4 text-[12px] leading-5 text-ink-3">
            Para redefinir ou substituir este acesso, use o fluxo administrativo controlado da KSP em vez da ativação inicial.
          </p>
        </div>
      </div>
    </main>
  );
}
