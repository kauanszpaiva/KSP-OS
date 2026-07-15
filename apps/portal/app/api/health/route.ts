export function GET() {
  return Response.json({ status: 'ok', service: 'ksp-client-portal', environment: process.env.VERCEL_ENV ?? 'local' });
}
