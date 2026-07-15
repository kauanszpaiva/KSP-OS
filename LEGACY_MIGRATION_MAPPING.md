# KSP Dominion Command OS
## Legacy System Migration Mapping

**Version:** 1.0  
**Classification:** Confidential

---

# 1. Migration Objective

Migrate useful KSP records from the current tracker, Google Drive, project tools, and repositories without importing formulas, duplicates, invalid values, or historical assumptions as authoritative truth.

Every imported record receives:

- source system;
- source file/sheet/row or external ID;
- export snapshot date;
- import batch;
- validation status;
- reviewer/resolution where quarantined;
- target record link after acceptance.

---

# 2. Current Tracker to Command OS Mapping

| Current source/tab | Target domain/entities | Migration rule | Reconciliation/owner |
|---|---|---|---|
| Start Here | Knowledge/SOP archive | Import as historical reference only; do not drive application rules. | Vanessa verifies relevance. |
| Dashboard | None as source data | Do not import calculated dashboard totals. Rebuild from authoritative records and compare for diagnostic purposes only. | Finance owner reviews differences. |
| Transactions | Import staging, source transactions, journal drafts | Validate date, type, amount, currency, account, vendor/client, payment method, project, duplicate, and accounting meaning. Invalid rows quarantine. Do not auto-post. | Finance/CPA reconcile by account and period. |
| Bank Accounts | Financial accounts and opening-balance candidates | Verify real institution, account type, ownership, currency, opening/cutover balance, and Restricted identifiers. | Executives + finance/CPA. |
| Payables & Debts | Vendor bills, card/loan liabilities, opening payable balances | Separate credit card balance, vendor bill, loan, reimbursement, and other liability. Link evidence and avoid duplicate transaction expense/payment. | Finance/CPA. |
| Projects | Projects, project budgets, client relations, historical economics | Match to client/agreement/service. Treat manually entered totals as candidates; rebuild from accepted finance data. | Eric + finance owner. |
| Subscriptions | Subscriptions, terms, charges, renewal reviews | Verify vendor, plan, billing currency/cycle, current amount, tax, renewal, notice period, owner, payment account, and status. | Vanessa/finance/technical owner. |
| Seats & Licenses | Software products, seats, assignments | Verify actual user/email, plan, active status, cost, department/project, and admin ownership. Temporary, inaccurate, or obsolete user records enter quarantine. | Vanessa + technical owner. |
| Monthly Burn | Forecast obligations / derived report | Do not import as ledger fact. Map underlying commitments/subscriptions/agreements and recalculate. | Finance owner. |
| Lists & Settings | Reference-data candidate set | Review values, duplicates, naming, active/inactive status, and replacement mappings. | Data stewards. |
| Team | Profiles, memberships, titles, engagement, skills | Current role labels are historical. User-approved hierarchy/role catalog governs target access. | Kauan + Vanessa. |
| Compensation | Restricted compensation/equity/profit-share candidate records | Do not import into general people/project tables. Require legal/finance review and effective dates. | Executives + advisor. |
| Personal Expenses | Expense reports/items and reimbursement liabilities | Validate receipt, date, amount, currency, payer, project, reimbursable status, approval, and whether already paid/posted. | Finance owner + person. |

---

# 3. Known Data-Quality Risks

The current tracker demonstrates or may contain:

- impossible/invalid dates;
- blank dates or amounts;
- manually calculated dashboard values;
- temporary or inaccurate users or account institutions;
- account balances that mix cash and liabilities;
- expenses paid through another person's account;
- credit-card charges and payments that can be double-counted;
- project totals not rebuilt from transactions;
- subscriptions without current use/renewal evidence;
- unclear distinction among equity, profit share, salary, and reimbursement;
- inconsistent project/client/vendor naming;
- records without receipts or external evidence;
- formula ranges that may omit later rows;
- historical role descriptions superseded by current decisions.

No such row is silently corrected. It enters a reason-coded quarantine or explicit mapping review.

---

# 4. Transaction Validation Rules

A transaction import requires or derives through reviewed mapping:

- valid transaction date;
- valid amount greater than zero or explicit signed convention;
- currency;
- financial meaning: income, expense, asset, liability, transfer, payment, refund, credit, or adjustment;
- source/destination financial account as applicable;
- counterparty;
- project/client/vendor dimensions where known;
- evidence or exception;
- duplicate fingerprint;
- original description and source row.

## Duplicate fingerprint candidates

- account;
- date/posting date;
- amount/currency;
- counterparty;
- payment/reference ID;
- normalized description;
- receipt/invoice number.

Duplicate candidates require review; they are not automatically deleted.

---

# 5. Credit Card and Personal-Payment Handling

## Card purchase

Recognize expense/asset and card liability when incurred.

## Card payment

Reduce bank cash and card liability. Do not recognize the expense again.

## Personal payment on behalf of KSP

Recognize KSP expense/asset and reimbursement/payable to the person unless treated otherwise by approved accounting policy. Settlement reduces payable and cash. Evidence and approval are required.

Opening card or reimbursement balances require a cutover reconciliation to avoid duplicating historical purchases.

---

# 6. Google Drive Mapping

## File inventory

For each in-scope file/folder:

- Drive ID/URL;
- title and MIME type;
- owner/Shared Drive;
- client/project relation;
- document type;
- classification;
- version/modified date;
- authoritative byte location;
- retention;
- access review;
- migration status.

## Rules

- Prefer company-owned Shared Drive locations for company records.
- Do not copy every file without purpose.
- Deduplicate by Drive ID and content/version evidence.
- Preserve links when Drive remains byte authority.
- Move/copy only through an approved ownership and permission plan.
- Restricted personal/medical records move to isolated collections, not ordinary project folders.
- Large media follows the media ADR.

---

# 7. ClickUp or Other Task-System Mapping

Map only active or contextually necessary historical work:

| Legacy object | Target |
|---|---|
| Space/folder/list | Portfolio/program/project/work package according to actual meaning. |
| Task/subtask | Work item and parent relation. |
| Status | Controlled state mapping, not copied as free text. |
| Assignee | Profile/project membership after identity match. |
| Due date | Validated due date/timezone. |
| Custom fields | Mapped to owned target fields or archived as source metadata. |
| Comment | Activity/comment with visibility review. |
| Attachment | Document/file reference with access/classification. |
| Dependency | Work-item dependency. |
| Time estimate/time | Estimate/actual only if reliable and required. |

Closed stale tasks should not flood the new system. Preserve an archive/export and selectively import records required for contract, knowledge, or active context.

---

# 8. GitHub Repository Mapping

## Existing static company repository

- Classify as public-company-site application/repository.
- Preserve existing deployment history and ownership.
- Link it to a KSP internal project/application record if desired.
- Do not add Command OS database/auth/business modules to it.

## New Command OS repository

- Create in KSP-owned GitHub Organization.
- Link repository, Vercel projects, Supabase projects, environments, CODEOWNERS, and runbooks in Command OS.
- Migrate no code from the static site unless a specific reusable asset passes review.

---

# 9. Migration Batches

Recommended batches:

1. Identity, users, subscriptions, and seats.
2. Clients, contacts, and opportunities.
3. Active projects, work, and documents.
4. Financial accounts, opening balances, transactions, payables, and reimbursements.
5. Historical projects/finance needed for comparison.
6. Media/assets/rights.
7. Knowledge and meeting records.

Each batch has a source freeze, export hash, mapping version, validation report, quarantine report, target totals, owner acceptance, and rollback/fallback record.

---

# 10. Parallel Run and Cutover

During parallel run:

- define which system is authoritative for each object;
- prevent dual uncontrolled editing;
- compare project status and financial totals;
- resolve exceptions daily;
- collect usability/access defects;
- test continuity exports and fallback.

Cutover requires:

- active records confirmed by owners;
- financial balances reconciled;
- access reviewed;
- critical documents available;
- quarantine below approved threshold with owners;
- legacy write access removed/read-only;
- archive snapshot protected;
- Kauan and Vanessa signoff.
