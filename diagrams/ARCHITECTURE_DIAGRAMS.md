# KSP Dominion Command OS
## Architecture Diagrams

These Mermaid diagrams are design references. Production diagrams must be updated when architecture decisions change.

---

# 1. System Context

```mermaid
flowchart LR
    K[Kauan - CEO / Primary System Owner]
    V[Vanessa - Executive Operations]
    E[Eric - Project Delivery]
    J[Joshua - Product Design / Front-End]
    T[Team / Contractors]
    C[Clients]

    OS[KSP Dominion Command OS]
    AP[Dominion Autopilot]

    GH[GitHub]
    VE[Vercel]
    SU[Supabase]
    GW[Google Workspace]
    FI[Future Accounting Platform]
    FG[Figma]
    MS[Approved Media Storage]

    K --> OS
    V --> OS
    E --> OS
    J --> OS
    T --> OS
    C -->|Client Portal| OS

    AP -->|Approved APIs / workflows only| OS
    OS --> SU
    OS <--> GH
    OS <--> VE
    OS <--> GW
    OS <--> FI
    OS <--> FG
    OS <--> MS
```

---

# 2. Command OS and Autopilot Boundary

```mermaid
flowchart TB
    H[Human or System Trigger] --> R[Autopilot Run Request]
    R --> P[Policy and Scope Check]
    P -->|Denied| D[Denied + Audit]
    P -->|Allowed| A[Agent Executes Read/Draft]
    A --> V[Schema / Policy / Confidence Validation]
    V -->|Invalid| X[Exception Queue]
    V -->|A0/A1 result| O[Private Result / Draft]
    V -->|A2 proposed internal write| C[Command OS Command API]
    V -->|A3 material action| Q[Human Approval Request]
    V -->|A4 restricted| Z[Prohibited / Supervised Procedure Only]
    Q -->|Rejected| D
    Q -->|Approved exact action| C
    C --> AUTH[Authorization + Validation + Approval Recheck]
    AUTH --> TX[Database Transaction + Audit + Outbox]
    TX --> DONE[Result + Monitoring]

    AP[Autopilot] -. no direct unrestricted DB .-> DB[(Production Database)]
    C --> DB
```

---

# 3. Application Containers

```mermaid
flowchart TB
    subgraph Vercel
      WEB[Next.js Web Application]
      API[Server Routes / Application Commands]
      PREVIEW[Preview Deployments]
      PROD[Production Deployment]
    end

    subgraph Supabase_Production
      AUTH[Supabase Auth]
      DB[(Postgres + RLS)]
      STORAGE[Private Storage]
      EDGE[Edge Functions]
      CRON[Cron]
      QUEUE[Durable Queues]
    end

    subgraph Shared_Code
      UI[Accessible UI Package]
      DOMAIN[Domain Packages]
      VALIDATION[Validation Contracts]
      OBS[Observability Package]
    end

    WEB --> API
    WEB --> AUTH
    API --> DOMAIN
    API --> DB
    API --> STORAGE
    EDGE --> DB
    EDGE --> QUEUE
    CRON --> EDGE
    QUEUE --> EDGE
    DOMAIN --> VALIDATION
    WEB --> UI
    API --> OBS
    EDGE --> OBS

    PREVIEW -. uses isolated non-production backend .-> STAGE[(Staging Supabase)]
    PROD --> DB
```

---

# 4. Authorization Decision

```mermaid
flowchart LR
    U[Authenticated User / Agent] --> S[Session Active?]
    S -->|No| DENY[Deny]
    S -->|Yes| MFA[Required Assurance Met?]
    MFA -->|No| STEP[Require MFA / Re-auth]
    MFA -->|Yes| MEM[Active Organization Membership?]
    MEM -->|No| DENY
    MEM -->|Yes| ROLE[Role Permission?]
    ROLE -->|No| DENY
    ROLE -->|Yes| SCOPE[Resource Scope / Relationship?]
    SCOPE -->|No| DENY
    SCOPE -->|Yes| CLASS[Data Classification Allowed?]
    CLASS -->|No| DENY
    CLASS -->|Yes| STATE[Record State Allows Action?]
    STATE -->|No| DENY
    STATE -->|Yes| SEP[Approval / Separation Requirement Met?]
    SEP -->|No| APPROVAL[Request Approval]
    SEP -->|Yes| ALLOW[Allow + Audit]
```

---

# 5. Client Portal Publication

```mermaid
sequenceDiagram
    participant Internal as Internal User
    participant OS as Command OS
    participant Approver as Required Approver
    participant Portal as Client Portal
    participant Client as Client User

    Internal->>OS: Submit exact record/version for publication
    OS->>OS: Validate classification and client relationship
    OS->>Approver: Approval request if policy requires
    Approver->>OS: Approve exact version
    OS->>OS: Create portal_publication record
    Client->>Portal: Request resource
    Portal->>OS: Authenticate membership + RLS
    OS-->>Portal: Published fields/version only
    Portal-->>Client: Display / approve / comment
    Client->>Portal: Approval on exact version
    Portal->>OS: Record client approval and audit
```

---

# 6. Financial Posting and Reconciliation

```mermaid
flowchart TB
    SRC[Invoice / Bill / Expense / Payment / Import] --> DRAFT[Draft Financial Record]
    DRAFT --> VALID[Validate date, currency, account, evidence, duplicates]
    VALID -->|Invalid| Q[Import / Review Quarantine]
    VALID -->|Valid| JE[Balanced Journal Draft]
    JE --> APPR[Approval Policy]
    APPR -->|Rejected| DRAFT
    APPR -->|Approved| POST[Post Immutable Entry]
    POST --> LEDGER[(Operational Ledger)]
    POST --> OUTBOX[Outbox Event]
    STMT[External Bank / Processor Statement] --> RECON[Reconciliation]
    LEDGER --> RECON
    RECON -->|Matched| CLOSED[Reconciled]
    RECON -->|Exception| EX[Owned Exception Queue]
    CLOSED --> PERIOD[Monthly Close / Period Lock]
    CORR[Correction Needed] --> REV[Reversal + Replacement]
    REV --> LEDGER
```

---

# 7. Creative Media Lifecycle

```mermaid
flowchart LR
    BRIEF[Approved Brief] --> PLAN[Script / Shot List / Call Sheet]
    PLAN --> READY{Releases, location, safety, crew, equipment ready?}
    READY -->|No| BLOCK[Blocked / Exception Approval]
    READY -->|Yes| CAP[Capture]
    CAP --> INGEST[Ingest Manifest + Checksum]
    INGEST --> BACKUP{Required copies verified?}
    BACKUP -->|No| BLOCK2[Do Not Delete Source Card]
    BACKUP -->|Yes| PROXY[Proxy / Edit Handoff]
    PROXY --> EDIT[Edit Version]
    EDIT --> REVIEW[Immutable Review Version + Timecoded Feedback]
    REVIEW --> QC[Technical / Content / Rights QC]
    QC --> APPROVE[Client / Internal Approval]
    APPROVE --> MASTER[Master + Derivatives]
    MASTER --> DELIVER[Delivery / Publication Evidence]
    DELIVER --> ARCHIVE[Archive / Retention / Rights Monitoring]
```

---

# 8. Software Delivery Pipeline

```mermaid
flowchart LR
    REQ[Requirement + Acceptance Criteria] --> ISSUE[Issue / Task Contract]
    ISSUE --> BRANCH[Isolated Branch / Worktree]
    BRANCH --> BUILD[Human / Claude / Codex / Jules Implementation]
    BUILD --> LOCAL[Local Checks]
    LOCAL --> PR[Pull Request]
    PR --> CI[CI: lint, type, unit, DB, RLS, integration, e2e, a11y, security]
    CI -->|Fail| BUILD
    CI -->|Pass| PREVIEW[Vercel Preview]
    PREVIEW --> REVIEW[CODEOWNERS + Domain QA]
    REVIEW -->|Changes| BUILD
    REVIEW -->|Approve| MERGE[Protected Merge]
    MERGE --> STAGING[Staging Deploy + Release Acceptance]
    STAGING --> PRODAPP[Production Approval]
    PRODAPP --> PROD[Production Deploy]
    PROD --> HEALTH[Health + Business Control Checks]
    HEALTH -->|Fail| ROLLBACK[Rollback / Disable / Forward Fix]
    HEALTH -->|Pass| CLOSE[Release Evidence Closed]
```

---

# 9. Environment Isolation

```mermaid
flowchart TB
    DEV[Developer / Approved Agent]
    GH[GitHub]

    DEV --> LOCAL[Local App + Local Supabase]
    DEV --> GH
    GH --> PR[Pull Request]
    PR --> VP[Vercel Preview]
    VP --> SP[(Preview/Test Backend - No Production Data)]

    GH --> MAIN[Protected main]
    MAIN --> VS[Vercel Staging]
    VS --> SS[(Separate Staging Supabase)]

    VS --> APPROVE[Production Release Approval]
    APPROVE --> VPROD[Vercel Production]
    VPROD --> SUPROD[(Separate Production Supabase)]

    DEV -. prohibited .-> SUPROD
    VP -. prohibited .-> SUPROD
    SS -. separate secrets .-> SUPROD
```

---

# 10. Migration Pipeline

```mermaid
flowchart LR
    SRC[Sheets / Drive / ClickUp / Existing Records] --> SNAP[Read-only Export Snapshot]
    SNAP --> MAP[Field and Authority Mapping]
    MAP --> NORM[Normalize]
    NORM --> VAL[Validate]
    VAL -->|Invalid / Duplicate / Ambiguous| Q[Quarantine]
    VAL -->|Valid| STAGE[Staging Import]
    STAGE --> RECON[Record and Financial Reconciliation]
    RECON -->|Fail| Q
    RECON -->|Pass| APPROVAL[Owner Approval]
    APPROVAL --> PROD[Production Import]
    PROD --> PAR[Parallel Verification]
    PAR --> CUT[Cutover]
    CUT --> ARCH[Legacy Read-only Archive]
```

---

# 11. Executive Information Flow

```mermaid
flowchart TB
    CRM[CRM / Clients]
    PM[Projects / Delivery]
    FIN[Finance / Procurement]
    CRE[Creative / Marketing]
    PPL[People / Capacity]
    SEC[Security / Incidents]
    AI[Autopilot Runs]

    CRM --> MET[Versioned Metrics / Exceptions]
    PM --> MET
    FIN --> MET
    CRE --> MET
    PPL --> MET
    SEC --> MET
    AI --> MET

    MET --> HEALTH[Explainable Health Models]
    MET --> FORECAST[Forecasts]
    MET --> DEC[Decision and Approval Queue]
    HEALTH --> BRIEF[Daily / Weekly Executive Brief]
    FORECAST --> BRIEF
    DEC --> BRIEF
    BRIEF --> K[Executive Command Center: Kauan + Vanessa]
    K --> ACTION[Approve / Decide / Delegate / Replan / Stop]
    ACTION --> WF[Controlled Workflow and Audit]
```
