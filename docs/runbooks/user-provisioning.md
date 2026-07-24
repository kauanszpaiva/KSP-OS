# Runbook — Provisioning users (internal + client portal)

How to create logins and assign roles for KSP-OS. Two provisioning scripts,
both service-role, both idempotent, both read secrets only from environment
variables (never from source):

- `scripts/provision-internal-user.mjs` — internal team members (Command app).
- `scripts/provision-portal-user.mjs` — client-portal users (Portal app).

> **Governance.** Per `reference/CLAUDE.md`, these scripts require a Supabase
> service-role key and therefore must be run **by a human operator against your
> own project — never Production**, and never by an automated agent. Point them
> at a development/staging project first. The service-role key is server-only:
> never commit it, never paste it into logs, chat, or a PR.

## Prerequisites

You need, from your Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL` — `https://<project>.supabase.co`
- `SUPABASE_SERVER_ONLY_SECRET_KEY` — the privileged server key (service role)

Node 22+ is required (the scripts use global `fetch`; no dependencies to install).

## 1. Super-admins — Kauan & Vanessa

"Supreme" access = the `founder_ceo` internal role (the top tier: passes
`is_founder`/`is_executive`, sees everything, and is the actor the permissions
engine allows for every action). Run once per person:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVER_ONLY_SECRET_KEY="<service key>" \
PROVISION_EMAIL="kauan@kspdominion.group" \
PROVISION_PASSWORD="<choose a strong password>" \
PROVISION_NAME="Kauan Paiva" \
PROVISION_ROLE="founder_ceo" \
node scripts/provision-internal-user.mjs

NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVER_ONLY_SECRET_KEY="<service key>" \
PROVISION_EMAIL="vanessa@kspdominion.group" \
PROVISION_PASSWORD="<choose a strong password>" \
PROVISION_NAME="Vanessa" \
PROVISION_ROLE="founder_ceo" \
node scripts/provision-internal-user.mjs
```

> The ability for Kauan/Vanessa to **manage other members' roles from inside the
> app** (grant/revoke) is a separate deliverable (the permissions-admin epic).
> Today, role changes are made by re-running this script with a different
> `PROVISION_ROLE`.

## 2. Internal members — Joshua, Eric, …

Same script, one run per person, with the role you want. The intended roster is
in `scripts/provision-users.json` (edit it to match reality).

> **Confirm the emails first.** The roster uses `firstname@kspdominion.group`
> as a sensible default pattern — replace with each person's real address
> before running. Valid roles are the `internal_role` values listed at the top
> of `scripts/provision-internal-user.mjs`.

```bash
# Joshua — project manager (adjust role as needed)
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVER_ONLY_SECRET_KEY="<service key>" \
PROVISION_EMAIL="joshua@kspdominion.group" \
PROVISION_PASSWORD="<strong password>" \
PROVISION_NAME="Joshua" \
PROVISION_ROLE="project_manager" \
node scripts/provision-internal-user.mjs

# Eric — developer (adjust role as needed)
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVER_ONLY_SECRET_KEY="<service key>" \
PROVISION_EMAIL="eric@kspdominion.group" \
PROVISION_PASSWORD="<strong password>" \
PROVISION_NAME="Eric" \
PROVISION_ROLE="developer" \
node scripts/provision-internal-user.mjs
```

## 3. Client-portal user — Everton (Bez Group)

Creates the auth user, the client organization ("Bez Group"), and the client
membership. Everton will sign in at the **portal** `/login` and see only Bez
Group's published data (enforced by RLS `is_portal_member`) — never any internal
table.

**One command** — Everton's details are pre-filled; supply only the two secrets
and a strong password:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVER_ONLY_SECRET_KEY="<service key>" \
PORTAL_PASSWORD="<a strong password>" \
pnpm seed:everton
```

That's it — Everton (everton@bezgroup.com, role `client_owner` on Bez Group) can
then sign in at the portal `/login`. See `scripts/provision.env.example` for the
variable reference.

To provision any other client user, use the general form:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVER_ONLY_SECRET_KEY="<service key>" \
PORTAL_EMAIL="person@client.com" PORTAL_PASSWORD="<strong password>" \
PORTAL_NAME="Name" CLIENT_ORG_NAME="Client Co" PORTAL_ROLE="client_owner" \
pnpm provision:portal
```

> **Password.** `password123` (from the request) is a weak placeholder — use a
> strong password here and have Everton rotate it. `PORTAL_ROLE` options:
> `client_owner`, `client_project_approver`, `client_billing_contact`,
> `client_collaborator`, `client_viewer`.

### Seeing something in the client panel

A freshly created client sees an empty portal until internal staff **publish**
something to them (projects/updates reach the client only when their state is
`published_to_client`). To populate Everton's view, from the Command app create
a mission/client content for Bez Group and publish it to the client.

## Ongoing use vs. bootstrap

These scripts are the **bootstrap/seed** path. The intended day-to-day flow for
adding client users is the in-app **invitation** flow
(`portal_invitations` → `accept_portal_invitation`), and for internal role
management, the permissions-admin UI (separate epic). Use the scripts to get
the first accounts in place.
