# KSP-OS — Outstanding Work (Command + Portal)

Raio-x único do que ainda falta nos dois apps do KSP-OS: **Command OS**
(`apps/command`) e **Client Portal** (`apps/portal`). Consolida os gaps
rastreáveis do rebuild (`docs/rebuild/`) e os gaps de profundidade contra o
blueprint (Fases 3–6 do `IMPLEMENTATION_ROADMAP_AND_BACKLOG.md`).

Legenda: `⬜` não iniciado · `🟨` parcial · `⛔` bloqueado por design (precisa
de revisão humana/compliance antes de construir) · `✅` feito.

Toda linha rastreia a um doc-fonte — nada aqui é inventado. Última revisão de
estado: 2026-07-26. Mantenha em sincronia com `docs/rebuild/STATUS.md` sempre
que uma fase mudar de status.

---

## Estado atual (baseline)

- **Command** — C0–C6 + redesign visual V0–V5 todos ✅. 20 módulos live, com
  Supabase + RLS + views alternativas (Board/Timeline/Calendar/Chart). Sem
  dívida de TODO/FIXME no código.
- **Portal** — P0 (auth/shell/convites) ✅, P1 (Home+Projects) ✅,
  P2 (Approvals+Requests) ✅. P3 (Files+Billing) ⬜ não iniciado.
- **Contra o blueprint** — o que existe hoje é majoritariamente a **camada de
  UI / vertical slices rasos**. Capacidades de profundidade (ledger financeiro
  operacional, ciclo de vida de mídia, integrações reais, migração de legado,
  Autopilot) permanecem como escopo futuro das Fases 3–6.

---

## Parte A — Gaps do rebuild (curto prazo, acionável já)

### Command

- [ ] **Finance — Journal Workbench** (draft/submit/approve/post/reverse) `⛔`
  — só o Overview read-only existe; escrita precisa de revisão humana de
  finanças antes de merge. `command/05_control_section.md` (C5.1.3 / C5.1.5 /
  C5.1.8).
- [ ] **Finance — Subscription Console** (renew/downgrade/cancel) `⛔` — as
  policies de escrita em `subscriptions` já existem (executive-only), mas a UI
  não. `command/05_control_section.md` (C5.1.6).
- [x] **Signals — detail slide-over** `✅` — painel lateral (`slide-over.tsx`)
  abre ao clicar no título (List/Board) com corpo completo + ações de triagem.
  `command/02_command_section.md` (C2.1.5).
- [x] **Decisions — packet view** `✅` — `SlideOver` com status/risco/valor/
  prazo, evidências (`evidence` jsonb), histórico de decisões e o `DecisionForm`
  governado inline. `command/02_command_section.md` (C2.2.4).
- [ ] **Decisions — modelo de estados completo** `⬜` — hoje achatado para 2
  estados (Waiting / Decided) e só `approved`/`rejected`; falta
  `request-changes`/`abstain` e co-aprovação multi-aprovador (limitado por
  CHECK constraint no DB). `command/02_command_section.md`.
- [x] **Comments / CommentThread — rollout** `✅` — ligado agora também em
  Missions (`projects`), Decisions (`approval_requests`) e Clients
  (`client_organizations`), reusando `getCommentsForObjects`/`postComment` sem
  migration. `command/06_cross_cutting.md` (C6.6.6).
- [x] **Comments — parsing de `@menção`** `✅` — `postComment` resolve `@handle`
  (nome/nome-compacto) via `resolveMentions`, grava em `mentions uuid[]` e
  dispara notificação `comment.mention`. 7 testes unitários. Também corrigido o
  `COMMENT_REVALIDATE_PATH` para projects/approval_requests/client_organizations.
  `command/06_cross_cutting.md` (C6.6.2).
- [x] **ActivityTimeline reutilizável** `✅` — extraído para
  `_components/activity-timeline.tsx`; Pulse consome via `label`. Qualquer
  módulo com `ActivityView[]` reutiliza. `command/06_cross_cutting.md` (C6.6.4).
- [x] **Command palette — registry por permissão** `✅` — cada quick-action tem
  `requires` espelhando seu gate server-side; o layout passa `palettePerms` e a
  palette esconde ações que o papel não pode executar. `command/06_cross_cutting.md` (C6.2.1).
- [ ] **Simplificações documentadas** `🟨` — sem dimensão "department" em
  Software (tasks não filtradas do pool geral); Knowledge só link/metadata (sem
  upload de arquivo); Connections só registro manual (sem OAuth flow);
  capacidade em Team/Horizon aproximada (sem tabela de horas planejadas).
  `command/05_control_section.md`, `command/03_execution_section.md`.

### Portal

- [x] **P3.1 Files** `✅` — `getClientDocuments` + política RLS
  `documents_portal_read` (client_visible + `public` + active + `is_portal_member`),
  UI `/files` agrupada por projeto (links para `storage_path`), plano de
  regressão SQL com o gate de classificação. `supabase/migrations/202607270011_portal_documents_read.sql`,
  `apps/portal/app/(portal)/files/`. `portal/03_files_billing.md`.
- [ ] **P3.2 Billing / Invoices** `⬜` — decisão de sequenciamento vs. Finance
  C5.1, `getClientInvoices`, UI lista de invoices + estado de pagamento +
  recibo, teste de isolamento por organização. `portal/03_files_billing.md`.
- [ ] **P3.2.3 Pagamento hospedado** `⛔` — fora de escopo por design; não
  ligar processador real sem go-ahead separado de finanças/compliance.
  `portal/03_files_billing.md`.
- [ ] **Meetings / Scheduling** `⬜` — a metade "Meetings" de "Meetings &
  Requests" não existe; só a parte Requests foi construída. Nenhuma superfície
  de agendamento/booking. `portal/02_approvals_requests.md`,
  `PRODUCT_INFORMATION_ARCHITECTURE.md` §12.
- [x] **Página "sem acesso"** `✅` — usuário logado sem/expirado/suspenso
  `client_memberships` agora vai para `/no-access` (explicação + sign out) em
  vez de `/login` silencioso. `apps/portal/app/no-access/page.tsx`,
  `apps/portal/lib/session.ts`. `portal/00_foundation.md`.
- [x] **UI de criação de convites** `✅` — form "Invite to portal" por cliente
  (executivo) no módulo Clients do Command; `createPortalInvitation` gera token,
  guarda só o sha256 e retorna o link `/invite/<token>` uma vez. 5 testes.
  `apps/command/app/(app)/_components/growth-forms.tsx`. `portal/00_foundation.md`.
- [x] **Preview pré-accept do convite** `✅` — visitante logado vê workspace /
  role / expiração / status antes de aceitar, via `preview_portal_invitation`
  (SECURITY DEFINER, só `authenticated`, sem email/ids). Convites não-pendentes
  mostram mensagem em vez do botão de aceitar. `supabase/migrations/202607260010_portal_invitation_preview.sql`,
  `apps/portal/app/invite/[token]/`. `portal/00_foundation.md`.
- [ ] **Approvals — "consolidated feedback"** `⬜` — thread de feedback do spec
  não implementado; hoje só accept/reject. `portal/02_approvals_requests.md`,
  `PRODUCT_INFORMATION_ARCHITECTURE.md` §12.

---

## Parte B — Gaps do blueprint (médio/longo prazo, estratégico)

Mapeado contra `IMPLEMENTATION_ROADMAP_AND_BACKLOG.md`. O rebuild entregou a
UI/vertical slices; abaixo é a **profundidade de blueprint** que falta. Cada
item = "o que existe hoje → o que falta".

### Fase 3 — Finance, Procurement & Subscriptions (P3-01…P3-13)

- [ ] **P3-01 Finance master data** — chart/periods/currencies/dimensions
  existem no schema (lidos read-only) → falta gestão e mappings completos.
- [ ] **P3-02 Journal / posting** — invariante débito/crédito e
  `post_journal_entry()` existem no DB → falta a UI de escrita
  (draft/approve/post/reverse). Espelha o Journal Workbench da Parte A. `⛔`
- [ ] **P3-03 Reconciliação bancária** `⬜` — imports, matching, transfers,
  exceções, close.
- [ ] **P3-04 AR / invoices** `⬜` — schedules, invoices, credits, payments,
  aging. (Pré-requisito do Portal P3.2.)
- [ ] **P3-05 AP / bills** `⬜` — bills, credits, approvals, payment records,
  aging.
- [ ] **P3-06 Despesas / reembolsos** `⬜` — receipt, checagem de política,
  posting, settlement.
- [ ] **P3-07 Vendors / procurement** `⬜` — controles de vendor, request,
  quote, PO, receipt, match.
- [ ] **P3-08 Subscriptions / seats** `🟨` — Connections/Subscriptions listados
  read-only → falta seats/usage/allocation/alerts e o console de decisões.
- [ ] **P3-09 Economia de projeto** `⬜` — revenue/budget/commitment/actual/
  ETC/margin com trace a registros postados.
- [ ] **P3-10 Cash / forecast** `⬜` — forecast de 13 semanas por cenário.
- [ ] **P3-11 Fechamento mensal** `⬜` — checklist, exceções, review, lock/reopen.
- [ ] **P3-12 Adapter contábil** `⬜` — mapping/sync/reconcile com plataforma
  estatutária.
- [ ] **P3-13 Migração de finanças legado** `⬜` — import de tracker,
  quarentena, saldos de abertura, reconciliação.

### Fase 4 — Department Workspaces (P4-S / P4-C / P4-M)

- [ ] **Software (P4-S01…S05)** — módulos Software/Content existem como UI →
  falta integração real GitHub (issues/PR/commit/webhooks) e Vercel
  (deployments/domains/health), releases/incidentes/rollback, template de
  website (SEO/a11y/launch). `⬜`
- [ ] **Creative & Media (P4-C01…C06)** — nenhum ciclo de mídia hoje → briefs/
  scripts/storyboard, planejamento de produção (shot list/call sheet),
  equipamento (custódia/manutenção), ingest com manifest+checksum, edit/review
  time-coded, rights/publication gate. `⬜`
- [ ] **Marketing (P4-M01…M04)** — Content/Campaigns como UI rasa → falta
  campanhas com spend/approval, calendário de conteúdo com evidência de
  publicação, tracking/atribuição (UTM), experimentos com stop rules. `🟨`

### Fase 5 — Migration, Portal & Adoption (P5-01…P5-09)

- [ ] **P5-02 Import framework** `⬜` — mapping/validation/quarentena/
  provenance, idempotente.
- [ ] **P5-03..05 Migração** `⬜` — CRM/projetos, documentos/knowledge, mídia/
  assets do legado.
- [ ] **P5-06 Expansão do portal** `🟨` — Home/Projects/Approvals/Requests
  live → falta inputs/deliverables/documents/invoices/support completos
  (converge com Portal P3).
- [ ] **P5-07 Training / SOPs** `⬜`.
- [ ] **P5-08 Parallel run / cutover** `⬜` — reconcile, freeze, archive,
  fallback, signoff executivo.
- [ ] **P5-09 Access review** `⬜` — atestação de user/client/integration/seat.

### Fase 6 — Executive Intelligence & Autopilot (P6-01…P6-10)

- [ ] **P6-01 Dicionário de KPI** `⬜` — definições/owners/sources/thresholds/
  freshness.
- [ ] **P6-02 Motor de saúde/exceção** `🟨` — Pulse mostra sinais curados →
  falta health explicável reproduzível com drivers.
- [ ] **P6-03 Briefs narrativos** `⬜` — daily/weekly/monthly com source links.
- [ ] **P6-04 Registry/policy de IA** `⬜` — agentes, capabilities, risk
  classes, budgets, **kill switches**.
- [ ] **P6-05..08 Níveis de autonomia** `⬜` — A0 summaries/search → A1 drafts
  → A2 ações internas com undo → A3 executor com aprovação humana explícita.
  Nenhum nível pode expandir sem passar os thresholds aprovados.
- [ ] **P6-09/10 Avaliação & agentes de dev** `⬜` — test sets, feedback, custo,
  incidentes; métricas/policy dos agentes Claude/Codex/Jules.

---

## Como manter este doc

1. Ao mudar o status de uma fase em `command/*.md` ou `portal/*.md`, atualize a
   linha correspondente aqui e em `STATUS.md`.
2. Itens `⛔` (Finance writes, pagamento hospedado) só saem de bloqueado com
   revisão humana documentada — nunca abrir por conveniência.
3. Parte B é rastreada por código de epic do
   `IMPLEMENTATION_ROADMAP_AND_BACKLOG.md`; ao começar um epic, mova o detalhe
   para um doc de fase próprio em `docs/rebuild/`.
