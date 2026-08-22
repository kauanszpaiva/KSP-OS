import { NextResponse } from 'next/server';

const SETUP_ENDPOINT = 'https://tqwnsxjrlomosfblleqy.supabase.co/functions/v1/ksp-portal-synthetic-setup';

function clientError(status: number) {
  if (status === 403) return 'Código de ativação inválido, expirado ou já utilizado.';
  if (status === 409) return 'Não foi possível concluir a ativação. Verifique a senha e tente novamente.';
  return 'Não foi possível concluir a ativação agora. Tente novamente em alguns instantes.';
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Dados de ativação inválidos.' }, { status: 400 });
  }

  const { token, password, confirm } = (payload ?? {}) as Record<string, unknown>;
  if (typeof token !== 'string' || typeof password !== 'string' || typeof confirm !== 'string') {
    return NextResponse.json({ ok: false, error: 'Preencha o código e a senha.' }, { status: 400 });
  }
  if (!token.trim() || !password || password !== confirm) {
    return NextResponse.json({ ok: false, error: 'Confira o código e confirme a mesma senha nos dois campos.' }, { status: 400 });
  }

  const form = new FormData();
  form.set('token', token.trim());
  form.set('password', password);
  form.set('confirm', confirm);

  try {
    const response = await fetch(SETUP_ENDPOINT, {
      method: 'POST',
      body: form,
      cache: 'no-store',
      redirect: 'manual'
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: clientError(response.status) }, { status: response.status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'O serviço de ativação está temporariamente indisponível.' },
      { status: 503 }
    );
  }
}
