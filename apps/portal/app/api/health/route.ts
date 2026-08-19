import { logger } from '@ksp/observability';

export function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  logger.info('Health check called', { requestId, service: 'ksp-client-portal' });

  return Response.json({
    status: 'ok',
    service: 'ksp-client-portal',
    environment: process.env.VERCEL_ENV ?? 'local',
    timestamp: new Date().toISOString()
  }, {
    headers: {
      'x-request-id': requestId
    }
  });
}
