-- KSP INC WhatsApp outbound authorization hardening.
-- V1 API dispatch is AI-action-backed only; human/manual replies remain in the WhatsApp Business App.

alter table public.communication_outbox
  alter column ai_action_id set not null;

comment on column public.communication_outbox.ai_action_id is
  'Required authorization/evidence link for API-dispatched WhatsApp replies. Dispatcher additionally requires a low-risk reply action with external_send_allowed=true.';
