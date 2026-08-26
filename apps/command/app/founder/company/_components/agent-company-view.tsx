import Link from "next/link";
import type { CSSProperties } from "react";
import type { Handoff } from "../../brain/data";
import {
  AGENTS,
  DEPARTMENTS,
  RANK_LABELS,
  agentsForDepartment,
  resolveAgentWorkState,
  type AgentWorkState,
} from "../agent-registry";
import styles from "./agent-company-view.module.css";

const STATE_META: Record<
  AgentWorkState,
  { label: string; shortLabel: string }
> = {
  working: { label: "Trabalhando em handoff real", shortLabel: "Trabalhando" },
  queued: { label: "Handoff aguardando claim", shortLabel: "Na fila" },
  blocked: { label: "Handoff bloqueado", shortLabel: "Bloqueado" },
  completed_recently: {
    label: "Entregou nas últimas 24h",
    shortLabel: "Entregou",
  },
  idle: { label: "Sem tarefa autorizada", shortLabel: "Sem tarefa" },
};

function PixelPerson({
  state,
  accent,
}: {
  state: AgentWorkState;
  accent: string;
}) {
  return (
    <span
      className={`${styles.pixelPerson} ${styles[state]}`}
      style={{ "--agent-accent": accent } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.pixelHead} />
      <span className={styles.pixelBody} />
      <span className={styles.pixelDesk} />
    </span>
  );
}

export function AgentCompanyView({
  handoffs,
  dataConnected,
}: {
  handoffs: Handoff[];
  dataConnected: boolean;
}) {
  const stateByAgent = new Map(
    AGENTS.map((item) => [item.id, resolveAgentWorkState(item, handoffs)]),
  );
  const stateCounts = AGENTS.reduce<Record<AgentWorkState, number>>(
    (counts, item) => {
      counts[stateByAgent.get(item.id) ?? "idle"] += 1;
      return counts;
    },
    { working: 0, queued: 0, blocked: 0, completed_recently: 0, idle: 0 },
  );
  const openHandoffs = handoffs.filter(
    (handoff) => !["done", "cancelled"].includes(handoff.status),
  ).length;

  return (
    <div className={styles.company}>
      <section className={styles.hero} aria-labelledby="ai-company-title">
        <div>
          <p className={styles.eyebrow}>Private · Founder OS · KSP INC</p>
          <h1 id="ai-company-title">AI Company</h1>
          <p className={styles.intro}>
            Seu escritório operacional: 77 papéis organizados, uma fila real de
            handoffs no Second Brain e nenhum agente fingindo trabalho.
          </p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.privateBadge}>Founder only</span>
          <Link className={styles.primaryAction} href="/founder/handoffs">
            Criar handoff
          </Link>
        </div>
      </section>

      <section
        className={styles.truthStrip}
        aria-label="Estado real da AI Company"
      >
        <div>
          <strong>{AGENTS.length}</strong>
          <span>papéis cadastrados</span>
        </div>
        <div>
          <strong>{stateCounts.working}</strong>
          <span>trabalhando agora</span>
        </div>
        <div>
          <strong>{openHandoffs}</strong>
          <span>handoffs abertos</span>
        </div>
        <div>
          <strong>{dataConnected ? "ON" : "OFF"}</strong>
          <span>fila Supabase</span>
        </div>
      </section>

      <section
        className={styles.realityNote}
        aria-label="Limite operacional atual"
      >
        <span className={styles.realityIcon}>!</span>
        <div>
          <strong>Estado honesto deste recorte</strong>
          <p>
            Os 77 registros abaixo são cargos e contratos de responsabilidade.
            Eles só aparecem como trabalhando quando existe um handoff realmente
            claimed no Supabase. Conectores Claude, Jules, ChatGPT e runtimes
            locais entram em fatias posteriores.
          </p>
        </div>
      </section>

      <section
        className={styles.officeSection}
        aria-labelledby="office-map-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Live work map</p>
            <h2 id="office-map-title">Escritório KSP INC</h2>
          </div>
          <div className={styles.legend} aria-label="Legenda de estados">
            {(Object.keys(STATE_META) as AgentWorkState[]).map((state) => (
              <span key={state}>
                <i className={`${styles.stateDot} ${styles[state]}`} />
                {STATE_META[state].shortLabel}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.officeFrame}>
          <div className={styles.officeTopbar}>
            <span>KSP INC · PRIVATE FLOOR 01</span>
            <span>{new Date().toISOString().slice(0, 10)}</span>
          </div>

          <div className={styles.ceoSuite}>
            <div className={styles.ceoLabel}>
              <span>CEO</span>
              <strong>Kauan Paiva</strong>
            </div>
            <div className={styles.ceoDesk} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>Founder desk · final authority · human approval</p>
          </div>

          <div className={styles.roomGrid}>
            {DEPARTMENTS.map((department) => {
              const departmentAgents = agentsForDepartment(department.id);
              const working = departmentAgents.filter(
                (item) => stateByAgent.get(item.id) === "working",
              ).length;
              const blocked = departmentAgents.filter(
                (item) => stateByAgent.get(item.id) === "blocked",
              ).length;
              return (
                <a
                  href={`#department-${department.id}`}
                  key={department.id}
                  className={styles.room}
                  style={
                    { "--room-accent": department.accent } as CSSProperties
                  }
                  aria-label={`${department.name}: ${working} trabalhando, ${blocked} bloqueados`}
                >
                  <div className={styles.roomHeader}>
                    <span>{department.shortName}</span>
                    <small>{departmentAgents.length} pessoas</small>
                  </div>
                  <div className={styles.roomFloor}>
                    {departmentAgents.map((item) => (
                      <PixelPerson
                        key={item.id}
                        state={stateByAgent.get(item.id) ?? "idle"}
                        accent={department.accent}
                      />
                    ))}
                  </div>
                  <div className={styles.roomFooter}>
                    <span>
                      {working > 0 ? `${working} working` : "quiet floor"}
                    </span>
                    {blocked > 0 && <strong>{blocked} blocked</strong>}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.rosterSection} aria-labelledby="roster-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Organization registry</p>
            <h2 id="roster-title">Departamentos e cadeia de comando</h2>
          </div>
          <p className={styles.sectionCopy}>
            Abra um departamento para ver mandato, nível e estado de cada papel.
          </p>
        </div>

        <div className={styles.departmentList}>
          {DEPARTMENTS.map((department) => {
            const departmentAgents = agentsForDepartment(department.id);
            return (
              <details
                id={`department-${department.id}`}
                className={styles.department}
                key={department.id}
                style={{ "--room-accent": department.accent } as CSSProperties}
              >
                <summary>
                  <span className={styles.departmentMark} aria-hidden="true" />
                  <span className={styles.departmentSummaryText}>
                    <strong>{department.name}</strong>
                    <small>{department.purpose}</small>
                  </span>
                  <span className={styles.departmentCount}>
                    {departmentAgents.length}
                  </span>
                </summary>
                <div className={styles.agentTable} role="list">
                  {departmentAgents.map((item) => {
                    const state = stateByAgent.get(item.id) ?? "idle";
                    return (
                      <article
                        className={styles.agentRow}
                        key={item.id}
                        role="listitem"
                      >
                        <PixelPerson state={state} accent={department.accent} />
                        <div className={styles.agentIdentity}>
                          <strong>{item.codename}</strong>
                          <span>{item.title}</span>
                        </div>
                        <span className={styles.rank}>
                          {RANK_LABELS[item.rank]}
                        </span>
                        <p>{item.mandate}</p>
                        <span
                          className={`${styles.statePill} ${styles[state]}`}
                        >
                          <i className={styles.stateDot} />
                          {STATE_META[state].label}
                        </span>
                      </article>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className={styles.nextStep}>
        <div>
          <p className={styles.eyebrow}>Next operational slice</p>
          <h2>Do organograma para execução auditável</h2>
        </div>
        <p>
          Registro de conectores, leases de trabalho, scheduler de 30 minutos,
          budgets zero-cost, approval gates, retries e evidência por job.
        </p>
        <Link href="/founder/handoffs">Abrir fila atual →</Link>
      </section>
    </div>
  );
}
