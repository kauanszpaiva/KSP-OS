-- KSP INC WhatsApp ingress hardening.
-- A Meta phone_number_id is a provider routing identifier and must resolve to exactly one KSP channel.
-- This migration is additive and remains production-gated with the WhatsApp Front Desk release.

create unique index if not exists communication_channels_provider_external_ref_global_uq
  on public.communication_channels (provider, external_ref)
  where external_ref is not null;

comment on index public.communication_channels_provider_external_ref_global_uq is
  'Prevents one provider routing identifier (for Meta, phone_number_id) from resolving to multiple KSP organizations.';
