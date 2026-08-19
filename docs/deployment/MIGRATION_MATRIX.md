# KSP OS Migration Matrix

**Date Generated:** 2026-08-21
**Base Ref:** 395aeea0a9cee76a7e6c4caf6277d33d1c3e2b2f

This document reconciles the KSP OS repository migration history with the actual runtime database lineage as discovered in the `appkspos` project.

| Migration Name | Status | Notes |
| :--- | :--- | :--- |
| `202607150001_foundation` | **APPLIED** | Found in repo and live DB. |
| `202607150002_identity_portal_finance_security` | **APPLIED** | Found in repo and live DB. |
| `202607210001_operational_slice` | **APPLIED** | Found in repo and live DB. |
| `202607230001_signals_decisions` | **APPLIED** | Found in repo and live DB. |
| `202607230002_missions` | **APPLIED** | Found in repo and live DB. |
| `202607230003_growth` | **APPLIED** | Found in repo and live DB. |
| `202607230004_control` | **APPLIED** | Found in repo and live DB. |
| `202607230005_cross_cutting` | **APPLIED** | Found in repo and live DB. |
| `202607230006_portal_foundation` | **APPLIED** | Found in repo and live DB. |
| `202607230007_portal_home_projects` | **APPLIED** | Found in repo and live DB. |
| `202607230008_portal_approvals_requests` | **APPLIED** | Found in repo and live DB. |
| `202607230009_timeline_start_dates` | **EXPECTED** | Verified in repo, applying soon. |
| `202607230010_member_management` | **EXPECTED** | Verified in repo, applying soon. |
| `202607240001_deletion_policies` | **EXPECTED** | Verified in repo, applying soon. |
| `202607260010_portal_invitation_preview` | **EXPECTED** | Verified in repo, applying soon. |
| `202607270011_portal_documents_read` | **EXPECTED** | Verified in repo, applying soon. |
| `202607270012_client_meetings` | **EXPECTED** | Verified in repo, applying soon. |
| `202608130001_runtime_reconciliation` | **EXPECTED** | Verified in repo, applying soon. |
| `202608130002_founder_os_foundation` | **EXPECTED** | Verified in repo, applying soon. |
| `202608160001_fix_rls_recursion_and_finance_rpc` | **EXPECTED** | Verified in repo, applying soon. |
| `202608200001_service_templates_work_packages` | **EXPECTED** | Verified in repo, applying soon. |
| `202608200002_workflows_and_deliverables` | **EXPECTED** | Verified in repo, applying soon. |
| `202608200004_releases` | **EXPECTED** | Verified in repo, applying soon. |
| `202608200003_social_media_domain` | **DEFERRED** | Moved out of standard path, gated behind Pack 05. |
| `portfolio_os_foundation` | **CONFLICT** | Live-only drift. Left untouched to protect lineage. |
| `portfolio_os_function_hardening` | **CONFLICT** | Live-only drift. Left untouched to protect lineage. |
| `portfolio_os_function_execute_scope` | **CONFLICT** | Live-only drift. Left untouched to protect lineage. |
| `portfolio_os_user_profiles` | **CONFLICT** | Live-only drift. Left untouched to protect lineage. |

### Glossary
* **APPLIED**: Known to be present in both the repository and the production Supabase project migration ledger.
* **EXPECTED**: Present in the repository but has not yet been applied to the live lineage.
* **DEFERRED**: Intentionally set aside in `supabase/deferred_migrations/` per requirements.
* **CONFLICT**: A migration applied to the production database that has no corresponding source in the repository. Do not overwrite or drop.
