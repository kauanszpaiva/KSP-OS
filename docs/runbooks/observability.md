# Observability Runbook

## Overview
This runbook covers the standard procedures for monitoring, diagnosing, and resolving performance and availability issues using the KSP OS Observability stack.

## Core Capabilities
- **Structured Logs**: All logs are emitted as JSON objects, making them searchable and aggregatable.
- **Request Tracing**: All incoming requests are assigned a unique `x-request-id` which propagates through middleware and downstream API calls (including Supabase).
- **Performance Budgets**: Key operations (e.g., `api.read`, `api.write`, `page.load`) have defined latency targets and critical thresholds. Violations are logged as warnings or errors.

## Responding to Alerts

### 1. High Latency Alerts (Performance Budget Breaches)
**Symptom**: Alerts triggered for `page.load` exceeding 1000ms or `api.read` exceeding 100ms.
**Action**:
1. Check Vercel logs for entries matching `Performance metric:` where `status` is `degraded` or `critical`.
2. Identify the specific route or operation causing the latency.
3. If the latency originates from a database call (`isSupabase: true`), review the query plan for missing indexes or inefficient RLS policies.
4. If the latency originates from external providers (e.g., GitHub, Resend), check their respective status pages.

### 2. Elevated Error Rates
**Symptom**: Increase in HTTP 500 errors or failed API operations.
**Action**:
1. Search logs for `"level":"error"`.
2. Extract the `requestId` from the error log.
3. Query all logs matching that `requestId` to reconstruct the full request lifecycle.
4. Review the `error.stack` property for application exceptions or Supabase response errors.

## Performance Tuning Guidelines
- **Measure Before Optimizing**: Use real query plans from Supabase Dashboard.
- **Do Not Blindly Add Indexes**: Only add indexes if justified by the workload. Verify with `EXPLAIN ANALYZE`.
- **Review RLS Policies**: Ensure `auth.uid()` checks are optimized and not causing nested loops.

## Critical Logs (Do Not Redact)
The logger automatically redacts properties containing keywords like `secret`, `token`, `password`. If you need to log an identifier, use keys like `id`, `reference`, `userId`.

## Definition of Done Checks
When resolving an issue, ensure you can answer:
- Is the system healthy?
- What failed? For whom? Since when?
- Which release caused it?
- Are performance budgets passing now?
