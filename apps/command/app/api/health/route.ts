export function GET(){ return Response.json({status:'ok',service:'ksp-command-os',environment:process.env.VERCEL_ENV ?? 'local'}); }
