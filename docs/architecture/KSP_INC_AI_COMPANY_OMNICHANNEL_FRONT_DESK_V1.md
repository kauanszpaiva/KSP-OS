# KSP INC AI Company — WhatsApp AI Front Desk V1

Status: source-only implementation slice. Production migration, Meta/WhatsApp provider activation, external sends and paid usage remain separately gated.

## Goal

Give the KSP AI Company one governed AI assistant for WhatsApp using Kauan's existing AT&T mobile number as the public phone identity. AT&T remains the mobile carrier; automation happens through the official WhatsApp Business Platform path. Supabase remains the canonical operational state.

## Scope

IN SCOPE:
- WhatsApp inbound messages on the existing AT&T number;
- WhatsApp AI replies;
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
- unofficial WhatsApp Web/browser automation.

## Non-negotiable invariant

The existing AT&T number remains the user's public number. KSP must not require a second WhatsApp number merely to enable AI automation when an official same-number path is available and eligible.

Canonical path:

`WhatsApp webhook -> signature verification -> normalization -> idempotency/dedupe -> identity resolution -> conversation -> governed KSP context -> policy gate -> AI decision -> human approval/handoff when required -> outbox -> WhatsApp delivery -> canonical event + CRM/project/task update + audit evidence`

## WhatsApp account mode

The implementation uses only an official WhatsApp Business Platform integration.

Preferred path: WhatsApp Business App Coexistence for an eligible existing business-app number. This keeps the same AT&T phone number usable in the WhatsApp Business App while the official API handles automation and webhooks.

If the number is currently registered only in the standard personal WhatsApp Messenger, production onboarding must first move that same number to WhatsApp Business App / an eligible business onboarding path. The phone number itself does not need to change and remains an AT&T line.

Eligibility, Meta Business Portfolio requirements and exact Tech Provider/BSP onboarding mechanics must be verified at activation time because Meta/provider requirements can change.

## Shared domain model

- Existing `contacts`, `leads` and `client_organizations` remain the business identity/CRM layer.
- `communication_channels` stores the configured WhatsApp transport connection.
- `communication_identities` maps the WhatsApp address to the KSP contact.
- `communication_conversations` stores the WhatsApp conversation state.
- `communication_events` is the append-oriented normalized WhatsApp event ledger.
- `communication_ai_actions` records what the AI proposed/executed, risk level and cost evidence.
- `communication_outbox` is the idempotent WhatsApp outbound queue with retry state.
- `communication_consents` stores channel/purpose consent evidence.

Provider credentials, OAuth tokens, API keys, Meta secrets, carrier PINs and WhatsApp secrets must never be stored in these business tables.

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

- Verify Meta/provider webhook signatures before business processing.
- Deduplicate every provider event with an organization-scoped key.
- Never let inbound WhatsApp content override application authorization or system policy.
- Treat message content and attachments as untrusted input.
- Minimize raw provider payload persistence; store canonical fields plus bounded metadata.
- Keep secrets in approved secret storage, not Supabase business rows or Git.
- Default database access to the KSP INC owner boundary in V1.
- Cross-client or cross-organization enumeration must fail closed.
- Human takeover immediately pauses AI outbound actions for that conversation.
- Outbox operations must be idempotent and retry-safe.
- Every AI side effect gets evidence/audit and budget accounting when variable cost exists.

## Provider adapter contract

The WhatsApp adapter should expose these conceptual operations:

1. `verifyInbound(request)`
2. `normalizeInbound(request) -> CanonicalWhatsAppEvent`
3. `send(outboxItem) -> ProviderDeliveryResult`
4. `normalizeDeliveryCallback(request)`
5. `health() -> WhatsAppChannelHealth`

Business logic never calls Meta/Twilio/another approved WhatsApp transport directly from UI components. It writes governed actions/outbox rows; the adapter delivers them.

## V1 acceptance criteria

- Source migration creates the communication ledger with owner-only RLS and anon denied.
- Only WhatsApp is exposed or enabled in this product slice.
- Communication objects are organization-scoped and link to existing contacts/leads/clients.
- Event and outbox dedupe keys are unique per organization.
- KSP INC exposes an owner-only WhatsApp AI Front Desk page that fails closed before schema promotion.
- No credential, AT&T number port, Meta account mutation, WhatsApp migration/onboarding, external send, paid model invocation or production DDL occurs in this source slice.
- CI/migration/RLS/tests/builds must be green before production approval can be requested.

## Controlled activation sequence

1. Confirm whether the existing number is on standard WhatsApp or WhatsApp Business App.
2. Verify same-number Coexistence eligibility with the selected official provider/Tech Provider path.
3. Configure a non-production Meta/WhatsApp integration and signed webhook endpoint.
4. Prove inbound event normalization, identity resolution and duplicate delivery handling.
5. Prove draft-only AI response and human takeover.
6. Prove outbound WhatsApp delivery in a sandbox/test conversation.
7. Obtain exact one-use production approval for schema/provider activation and any recurring/variable spend.
8. Enable the existing AT&T number only after the activation checklist passes.
