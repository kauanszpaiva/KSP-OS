import { NextResponse } from 'next/server';

const retiredMessage = 'Este acesso BEZ TEAM já foi ativado. Entre pelo Portal ou solicite uma redefinição de acesso à KSP.';

export async function POST() {
  return NextResponse.json(
    { ok: false, error: retiredMessage, code: 'activation_retired' },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
