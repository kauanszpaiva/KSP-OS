# KSP INC AI Company — WhatsApp AI Front Desk V1

Status: source-only implementation slice. Production migration, Meta/WhatsApp provider activation, external sends and paid/model usage remain separately gated.

## Goal

Give the KSP AI Company one governed AI assistant for WhatsApp using Kauan's existing AT&T mobile number as the public phone identity. AT&T remains the mobile carrier; automation happens through the official WhatsApp Business Platform path. Supabase remains the canonical operational state.

## Scope

IN SCOPE:
- WhatsApp inbound messages on the existing AT&T number;
- governed WhatsApp AI replies after activation;
- shared KSP contact/lead/client context;
- conversation memory and summaries;
- CRM/task/follow-up updates;
- human takeover and pause/resume;
- WhatsApp delivery evidence, consent state and audit trail.

OUT OF SCOPE:
- ordinary carrier SMS;
- cellular phone calls;
- voicemail;
- email;
- call recording/transcription;
- porting the AT&T number away from AT&T;
- unofficial WhatsApp Web/browser automation;
- proactive/broadcast marketing in V1;
- free-form API messages outside WhatsApp's customer-service window.

## Non-negotiable invariant

The existing AT&T number remains the user's public number. KSP must not require a second WhatsApp number merely to enable AI automation when an official same-number path is available and eligible.

Canonical path:

`WhatsApp webhook -> environment gate -> signature verification -> normalization -> idempotency/dedupe -> identity resolution -> conversation -> governed KSP context -> policy gate -> AI decision -> human approval/handoff when required -> authorized outbox -> customer-service-window check -> WhatsApp delivery -> canonical event + CRM/project/task update + audit evidence`

## WhatsApp account mode

The implementation uses only an official WhatsApp Business Platform integration.

Preferred path: WhatsApp Business App Coexistence for an eligible existing business-app number. This keeps the same AT&T phone number usable in the WhatsApp Business App while the official API handles automation and webhooks.

If the number is currently registered only in the standard personal WhatsApp Messenger, production onboarding must first move that same number to WhatsApp Business App / an eligible business onboarding path. The phone number itself does not need to change and remains an AT&T line.

Eligibility, Meta Business Portfolio requirements and exact Tech Provider/BSP onboarding mechanics must be verified at activation time because Meta/provider requirements can change.

## Shared domain model

- Existing `contacts`, `leads` and `client_organizations` remain the business identity/CRM layer.
- `communication_channels` stores the configured WhatsApp transport connection and explicit automation mode: `off`, `observe`, `draft`, or `autonomous`.
- `communication_identities` maps the WhatsApp address to the KSP contact.
- `communication_conversations` stores the WhatsApp conversation and human-handoff state.
- `communication_events` is the append-oriented normalized WhatsApp event ledger.
- `communication_ai_actions` records what the AI proposed/executed, risk level, approval state and cost evidence.
- `communication_outbox` is the claimed outbound queue. API dispatch requires a linked AI reply action.
- `communication_consents` stores channel/purpose consent evidence.

Provider credentials, OAuth tokens, API keys, Meta secrets, carrier PINs and WhatsApp secrets must never be stored in these business tables.

## Implemented Meta ingress contract

Source endpoint: `GET|POST /api/whatsapp/meta/webhook`.

Before the endpoint accepts any Meta traffic, all of the following must agree:
- `WHATSAPP_META_WEBHOOK_ENABLED=true`;
- request host equals `WHATSAPP_META_WEBHOOK_HOST`;
- `NEXT_PUBLIC_SUPABASE_URL` resolves to `WHATSAPP_META_SUPABASE_PROJECT_REF`;
- GET subscription challenge uses `WHATSAPP_META_VERIFY_TOKEN`;
- POST body verifies `X-Hub-Signature-256` with `WHATSAPP_META_APP_SECRET`.

The POST path additionally:
- caps raw body size at 512 KiB;
- verifies the raw body before JSON parsing/business processing;
- accepts at most 50 normalized events per delivery;
- stores minimized canonical fields rather than the raw webhook;
- never automatically downloads inbound media;
- routes Meta `phone_number_id` through a globally unique provider routing identifier;
- requires an active channel with `inbound_enabled=true` for messages;
- requires an active channel with `outbound_enabled=true` for delivery callbacks;
- deduplicates provider messages and statuses;
- uses a server-only Supabase service client only after the environment and signature gates pass.

Inbound content remains untrusted data. It cannot grant permissions, change policy, enable external sending, or override a human handoff.

## Implemented outbound contract

Source endpoint: `POST /api/whatsapp/meta/outbox`.

This endpoint is dormant by default. Dispatch requires all of the following:
- the same exact environment/host/Supabase gate as the webhook;
- `WHATSAPP_META_EXTERNAL_SENDS_ENABLED=true`;
- a constant-time matching bearer using `WHATSAPP_META_OUTBOX_SECRET`;
- `WHATSAPP_META_ACCESS_TOKEN` in server-only secret storage;
- an explicit `WHATSAPP_META_GRAPH_VERSION` such as a currently supported `vX.Y`;
- an active Meta/WhatsApp channel with `outbound_enabled=true`;
- an open conversation with a WhatsApp identity;
- a linked `communication_ai_actions` row with `action_type='reply'`, `risk_level='low'`, and `metadata.external_send_allowed=true`;
- if that reply action requires human approval, `status='approved'` and `approved_by` must be present;
- the recipient must be derived from the canonical conversation identity, never from untrusted outbox payload input;
- the latest user inbound message must be within the 24-hour customer-service window.

V1 sends only plain text free-form replies through the official Cloud API message endpoint. No proactive/template/broadcast sender is implemented in this slice.

Outbound claiming is deliberately at-most-once oriented. A claimed message moves to `sending` before the provider call. Timeout or ambiguous transport/provider outcomes are not automatically requeued, because avoiding accidental duplicate customer messages is safer than aggressive retry. Reconciliation/manual review is required for ambiguous failures.

## Autonomy policy

Once provider and production gates are explicitly approved, the WhatsApp assistant may autonomously:
- identify itself as Kauan's/KSP's virtual assistant rather than impersonating Kauan;
- answer approved factual questions from governed KSP context;
- classify intent and urgency;
- capture and normalize lead/contact details;
- create or update a lead;
- create a task or follow-up;
- provide approved scheduling/status information;
- preserve memory across the conversation;
- summarize the thread;
- detect when a human should take over;
- stop autonomous replies while human takeover is active;
- resume only after an explicit audited release of the handoff.

Human approval or escalation remains required for:
- unapproved pricing, discounts or commercial commitments;
- contract/legal acceptance;
- payments, refunds or money movement;
- secrets, authentication, access-control or destructive actions;
- sensitive personal/financial disclosures;
- unsupported claims;
- any action blocked by consent, Meta policy, KSP policy or applicable law.

## Security contract

- Verify environment + Meta/provider webhook signatures before privileged business processing.
- Deduplicate every provider event and provider delivery callback.
- Keep each Meta provider routing identifier globally unambiguous.
- Never let inbound WhatsApp content override application authorization or system policy.
- Treat message content and attachments as untrusted input.
- Minimize raw provider payload persistence; store canonical fields plus bounded metadata.
- Keep secrets in approved secret storage, not Supabase business rows or Git.
- Default database access to the KSP INC owner boundary in V1.
- Cross-client or cross-organization enumeration/writes must fail closed.
- Human takeover immediately pauses AI outbound actions for that conversation.
- API outbox dispatch requires explicit AI-reply authorization evidence.
- Every AI side effect gets evidence/audit and budget accounting when variable cost exists.

## Provider adapter contract

Implemented source operations now cover:
1. Meta subscription challenge verification;
2. HMAC verification of inbound POSTs;
3. canonical inbound message/media normalization;
4. delivery-status normalization;
5. official Cloud API text request construction;
6. guarded text delivery from the authorized outbox.

Business logic never calls Meta/Twilio/another approved WhatsApp transport directly from UI components. It writes governed actions/outbox rows; the adapter delivers them only after server-side gates pass.

## What is not implemented yet

- No Meta business/WABA/phone-number onboarding has been performed.
- No production Meta token or app secret has been stored.
- No real webhook subscription exists.
- No external WhatsApp message has been sent.
- No paid/variable-cost LLM provider is enabled for this front desk.
- No production AI reply composer has yet been authorized to create `reply` actions with `external_send_allowed=true`.
- No template/proactive marketing sender is included in V1.

## V1 acceptance criteria

- Source migrations create the WhatsApp communication ledger with owner-only RLS and anon denied.
- Only WhatsApp is exposed or enabled in this product slice.
- Communication objects are organization-scoped and link to existing contacts/leads/clients.
- Meta `phone_number_id` routing cannot resolve to multiple KSP organizations.
- Invalid `voice`, `sms`, `email`, automation modes and cross-tenant links fail in DB tests.
- Automation defaults to `off`.
- KSP INC exposes an owner-only WhatsApp AI Front Desk page that fails closed before schema promotion.
- Signed webhook ingestion and outbound sender environment gates have automated tests.
- Outbound API dispatch requires a low-risk authorized reply action and a valid 24-hour customer-service window.
- No credential, AT&T number port, Meta account mutation, WhatsApp migration/onboarding, external send, paid model invocation or production DDL occurs in this source slice.
- CI/migration/RLS/tests/builds must be green on the exact source head before production approval can be requested.

## Controlled activation sequence

1. Confirm whether the existing number is on standard WhatsApp or WhatsApp Business App.
2. Verify same-number Coexistence eligibility with the selected official provider/Tech Provider path.
3. Reconcile the KSP production database migration lineage gate before any DDL promotion.
4. Configure a non-production Meta/WhatsApp integration and signed webhook endpoint without reusing production data/secrets.
5. Prove subscription challenge, invalid-signature rejection, inbound event normalization, identity resolution and duplicate handling.
6. Prove `observe` then `draft` mode, including human takeover and blocked send paths.
7. Prove one bounded outbound WhatsApp text reply inside the customer-service window on a test conversation.
8. Add/approve the production AI reply composer and budget/provider gate separately.
9. Obtain exact one-use production approval for schema/provider activation and any recurring/variable spend.
10. Enable the existing AT&T number only after the activation checklist passes.
