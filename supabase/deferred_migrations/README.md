# Deferred Migrations

Migrations in this directory are intentional and not part of the active production replay lineage.

- `202608200003_social_media_domain.sql` represents the PR #52 Social/Delivery schema and must remain deferred until Pack 05 approves its security and integrity model.
- `202608200004_releases.sql` remains deferred pending its release-control gate.
- `202608210001_finance_pack.sql` is preserved as legacy lineage evidence only. It references the pre-identity `clients` relation and creates a legacy `invoices` / `invoice_lines` model that conflicts with the later canonical `202608211915_invoice_delivery.sql` customer-invoice model. It must not be promoted back into the active chain without a newly reviewed finance migration design.
