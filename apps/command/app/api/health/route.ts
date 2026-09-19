import { logger } from '@ksp/observability';

export function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  logger.info('Health check called', { requestId, service: 'ksp-command-os' });

  const environment = process.env.VERCEL_ENV ?? 'local';
  const previewRecoveryRuntime = environment === 'preview'
    ? {
        resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
        serviceRoleConfigured: Boolean(
          process.env.SUPABASE_SERVER_ONLY_SECRET_KEY?.trim()
          || process.env.SUPABASE_SERVER_ONLY_SERVICE_KEY?.trim()
        )
      }
    : undefined;

  return Response.json({
    status: 'ok',
    service: 'ksp-command-os',
    environment,
    timestamp: new Date().toISOString(),
    ...(previewRecoveryRuntime ? { recoveryRuntime: previewRecoveryRuntime } : {})
  }, {
    headers: {
      'x-request-id': requestId
    }
  });
}
