# KSP INC AI Company — Omnichannel Front Desk V1

Status: source-only implementation slice. Provider activation, production migration, carrier changes, external sends and paid usage remain separately gated.

## Goal

Give the KSP AI Company one governed communication memory across voice calls, SMS, WhatsApp and email. A provider is transport infrastructure, not the system of record. Supabase remains the canonical operational state.

## Non-negotiable invariant

The same person must not become four disconnected records just because they contacted KSP through four channels.

Canonical path:

`provider webhook -> signature verification -> normalization -> idempotency/dedupe -> identity resolution -> unified conversation -> governed context load -> policy gate -> AI decision -> human approval/handoff when required -> outbox -> provider delivery -> canonical event + CRM/project/task update + audit evidence`

## Shared domain model

- Existing `contacts`, `leads` and `client_organizations` remain the business identity/CRM layer.
- `communication_channels` represents configured transport adapters.
- `communication_identities` maps phone numbers, WhatsApp addresses and email addresses to the same KSP contact.
- `communication_conversations` is the cross-channel conversation state.
- `communication_events` is the append-oriented normalized event ledger.
- `communication_ai_actions` records what the AI proposed/executed, its risk level and cost evidence.
- `communication_outbox` is the idempotent outbound queue with retry state.
- `communication_consents` stores consent/permission evidence required by channel, purpose or jurisdiction.

Provider credentials, OAuth refresh tokens, API keys, carrier PINs and WhatsApp secrets must never be stored in these tables.

## Channel strategy

### Voice / existing AT&T public number

Phase A keeps the existing mobile line and uses carrier call forwarding to a programmable voice endpoint for inbound AI reception. This preserves the public number while avoiding an immediate carrier move. Outbound caller identity and SMS on the original mobile number remain capability-gated until a supported configuration is verified.

Phase B may port the existing number to a programmable carrier only after portability is confirmed and Kauan gives an exact one-use approval. Porting is operationally disruptive and is not part of V1 source work.

### SMS

The adapter contract supports inbound/outbound SMS. Exact same-number control depends on the carrier/hosted-messaging/portability path selected later. Do not fake same-number support when the carrier cannot expose it programmatically.

### WhatsApp

Use only the official WhatsApp Business Platform path through an approved Meta/Twilio configuration. Registration/migration of an existing WhatsApp or WhatsApp Business App number can change how that number is usable in the mobile app, so onboarding is a separately reviewed action. The communication ledger does not depend on which approved provider is selected.

### Email

Mailbox ingestion/reply should use an approved Gmail OAuth integration for a Workspace mailbox or an approved inbound-email provider such as Resend where appropriate. Email threads normalize into the same contact/conversation/event model as phone and WhatsApp.

## Autonomy policy

Default autonomous actions may include, once provider and policy gates are approved:
- greet and identify the virtual assistant;
- answer approved factual FAQs from governed KSP context;
- capture lead/contact details;
- classify intent and urgency;
- create/update a lead, task or follow-up;
- provide approved scheduling/status information;
- summarize calls/messages and attach the summary to the same conversation;
- switch channels without losing context;
- hand off to a human and stop autonomous replies while takeover is active.

Human approval or escalation is required for:
- unapproved pricing, discounts or commercial commitments;
- contract/legal acceptance;
- payments, refunds or money movement;
- secrets, authentication, access-control or destructive actions;
- sensitive personal/financial disclosures;
- high-impact claims with insufficient source evidence;
- any action blocked by consent, jurisdiction or provider policy.

## Voice and recording guardrails

Inbound AI answering and outbound AI calling are different risk classes. Before any outbound artificial/AI voice campaign, verify the current TCPA/FCC consent requirements and approved calling purpose. The assistant should identify itself as a virtual KSP assistant rather than impersonating Kauan.

For call recording/transcription, jurisdictional consent rules must be evaluated before recording starts. Massachusetts law treats secret recording/interception as sensitive and defines interception around secret hearing/recording without prior authority from all parties. The implementation must support disclosure/consent evidence and a no-recording fallback.

## Security contract

- Verify provider webhook signatures before parsing business actions.
- Deduplicate every provider event with an organization-scoped key.
- Never let webhook payload instructions bypass application authorization.
- Minimize raw provider payload persistence; store canonical fields plus bounded metadata.
- Keep secrets in approved secret storage, not Supabase business rows or Git.
- Default database access to KSP INC owner boundary in V1.
- Cross-client or cross-organization enumeration must fail closed.
- Human takeover is explicit, auditable and immediately pauses AI outbound actions for that conversation.
- Outbox operations must be idempotent and retry-safe.
- Every AI side effect has an evidence record/audit trail and budget accounting when a model/provider has variable cost.

## Provider adapter contract

Every adapter should implement the same conceptual operations:

1. `verifyInbound(request)`
2. `normalizeInbound(request) -> CanonicalCommunicationEvent`
3. `send(outboxItem) -> ProviderDeliveryResult`
4. `normalizeDeliveryCallback(request)`
5. `health() -> ChannelHealth`

Business logic never calls Twilio, Meta, Gmail or Resend directly from UI components. It writes governed actions/outbox rows; adapters deliver them.

## V1 acceptance criteria

- Source migration creates the seven provider-neutral communication tables with owner-only RLS and anon denied.
- Communication objects are organization-scoped and link to existing contacts/leads/clients.
- Event and outbox dedupe keys are unique per organization.
- KSP INC exposes an owner-only Omnichannel Front Desk page that fails closed before schema promotion.
- No credential, number-port request, WhatsApp migration, external send, paid call/model invocation or production DDL occurs in this slice.
- CI/migration/RLS tests must be green before this can move beyond Draft review.

## Later vertical slices

1. Inbound email sandbox -> same contact/conversation -> draft-only AI reply -> human handoff.
2. Inbound programmable voice sandbox -> AI greeting -> intent capture -> transcript summary -> same conversation.
3. Inbound SMS sandbox -> same identity -> shared context -> safe reply.
4. Official WhatsApp sandbox -> same conversation state.
5. Controlled provider promotion and production rollout with channel-specific compliance and cost gates.
