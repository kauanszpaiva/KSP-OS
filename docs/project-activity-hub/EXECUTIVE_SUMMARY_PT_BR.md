# Resumo Executivo — KSP Project Activity Hub

Status: **Completo** (somente planejamento) · 2026-07-23

Este documento resume, em português, o resultado do trabalho de auditoria e planejamento solicitado para o futuro módulo "KSP Project Activity Hub". Nenhum código, migração, dependência ou integração de produção foi criado nesta etapa — é exclusivamente um pacote de planejamento, conforme solicitado.

## 1. Objetivo do documento

Consolidar, de forma factual e sem jargão técnico desnecessário, o que foi investigado, o que foi decidido (e o que ainda depende de decisão de Kauan), e qual é o próximo passo concreto para quem for ler este pacote sem ter acompanhado o processo de planejamento.

## 2. Escopo do trabalho realizado

Auditoria completa do KSP OS atual + pesquisa de capacidades reais (não memória/suposição) de GitHub, Vercel, Supabase, Claude Code, Claude API, Codex e integração via MCP/ChatGPT. Produção de 13 documentos numerados (`00` a `12`), 15 Architecture Decision Records (ADRs), um roadmap de implementação com backlog numerado (PAH-001 a PAH-020), este resumo executivo e um `manifest.json` indexando tudo. Trabalho feito inteiramente na branch `plan/ksp-project-activity-hub`, separada da branch de reconstrução de UI em andamento.

## 3. O que foi auditado no sistema atual

O KSP OS já possui: tabelas de auditoria (`activity_events`/`audit_events`) com um padrão de dual-write já em uso; uma tabela `ai_actions` criada mas nunca usada, já preparada para registro de ações de agentes de IA; uma tabela `background_jobs` também criada mas não usada; um `createServiceClient()` definido mas sem nenhum ponto de uso no código; zero endpoints de webhook, zero fila/processador de jobs, e zero integração com GitHub/Vercel/Supabase hoje. Um padrão recorrente do próprio código-base — tabela com RLS habilitado mas sem política de escrita — já foi encontrado 7 vezes durante a reconstrução recente da UI, e é tratado como regra obrigatória: toda nova tabela deste plano deve vir com sua política de escrita na mesma migration.

## 4. Principais descobertas por provedor

- **GitHub**: modelo de permissões via GitHub App, verificação de assinatura HMAC-SHA256, janela de reenvio de 3 dias, limites de taxa documentados.
- **Vercel**: webhooks dependentes de plano (Pro/Enterprise a confirmar), assinatura HMAC-SHA1 (mais fraca que a do GitHub), API de deployments, campo `meta.githubCommitSha` para correlacionar GitHub↔Vercel.
- **Supabase**: Management API, Auditoria de Autenticação (todos os planos), Auditoria de Plataforma (só planos Team+), Database Webhooks (todos os planos), pgaudit, Log Drains (add-on pago, hoje sem assinatura verificável).
- **Claude Code / Claude API**: Agent SDK, hooks, sessões com ID retomável, custo por sessão já disponível, API de uso/custo em nível de organização (requer chave admin separada).
- **Codex / OpenAI / MCP**: CLI com saída JSON estruturada, SDK oficial apenas em TypeScript, tarefas em nuvem sem API REST confirmada, e uma descoberta importante: auditoria de ações por usuário via MCP **não é garantida pelo protocolo** — depende de como o próprio servidor MCP da KSP implementaria autorização OAuth.

## 5. Escopo do produto proposto

Um "ledger" unificado de atividade por projeto, conectando o que acontece no KSP OS, no GitHub, na Vercel, no Supabase e nas sessões de agentes de IA (Claude Code/Codex) em uma única linha do tempo por projeto — com usuários primários e secundários mapeados nos papéis reais já existentes no KSP OS (16 papéis internos, 5 papéis de cliente), e limites explícitos de não-escopo (ex.: nenhum ranking de produtividade por pessoa, nenhuma ação automática irreversível nesta fase).

## 6. Modelo de correlação e proveniência

Toda evidência bruta recebida é preservada separadamente do evento normalizado. A correlação entre eventos acontece em três níveis: Nível 1 (explícito — um ID de tarefa citado diretamente), Nível 2 (determinístico — SHA de commit ou ID de provedor idêntico) e Nível 3 (inferido — similaridade de horário/autor/título, sempre com pontuação e explicação, nunca promovido automaticamente a fato comprovado). Uma sugestão de Nível 3 nunca vira, sozinha, prova de conclusão de tarefa.

## 7. Modelo de dados

Modelo conceitual (sem migrations reais) com 14 tabelas, reaproveitando o padrão já existente de referência polimórfica (`object_table`/`object_id`) usado por `comments`/`notifications`/`client_publications`, e avaliando explicitamente o reaproveitamento das tabelas já existentes e não usadas (`ai_actions`, `background_jobs`) antes de propor qualquer tabela nova.

## 8. Arquitetura do sistema

Pipeline: recebimento assinado → gravação bruta imediata → confirmação rápida (antes de qualquer processamento pesado) → normalização assíncrona → mapeamento de projeto → resolução de autor → deduplicação → correlação → linha do tempo. Recomendação de fila: começar com uma tabela de polling simples (sem nova dependência), migrando para `pgmq` (extensão nativa do Postgres/Supabase) apenas se o volume de eventos crescer além da escala atual da KSP.

## 9. Segurança, privacidade e confiança

Tabela de ameaças com cerca de 25 cenários mapeados (falsificação de assinatura, replay, vazamento entre clientes, injeção de prompt via conteúdo externo, etc.), matriz de retenção por categoria de dado, e o princípio de que todo dado sensível recebido de provedores externos passa por uma camada de redação antes de ser armazenado.

## 10. UX e navegação

As telas realmente novas (Atividade, Deployments, Banco de Dados, Sessões de IA, Releases, Incidentes) são propostas como abas de uma nova página de detalhe de Missão (que ainda não existe hoje — Missions é hoje só uma lista) — e não como duplicação de módulos que já existem (Tasks, Roadmap, Files já são cobertos por Workspace/Schedule-Horizon/Knowledge). O único item novo de nível superior é um "Centro de Operações" cross-projeto.

## 11. Plano de testes

Cobertura especificada em cinco camadas: testes unitários, de integração, ponta-a-ponta, de segurança e de performance — incluindo um teste específico que garante que todo resumo gerado por IA cite eventos reais como fonte (nunca uma afirmação sem evidência rastreável).

## 12. Roteiro de implementação

Uma primeira "fatia vertical" (um projeto real, um repositório GitHub, um projeto Vercel) prova o pipeline completo antes de qualquer investimento maior. Depois, oito fases (0 a 7), terminando em um "Centro de Ações Controladas" (Fase 7) que é deliberadamente **não desenhado** neste pacote — automação de ações reais em sistemas externos exige uma rodada de planejamento e aprovação própria, separada desta. Backlog com 20 épicos (PAH-001 a PAH-020), cada um com critérios de aceite, requisitos de segurança e de teste já definidos.

## 13. Operação e runbooks

Doze cenários operacionais documentados com sintoma → causa provável → diagnóstico → resolução → escalonamento (eventos que não chegam, assinaturas inválidas, eventos duplicados, mapeamento de projeto errado, fila acumulando, recuperação de eventos com falha permanente, sessão de IA travada, indisponibilidade de provedor/banco, resumo de IA incorreto, suspeita de vazamento de dados, integração desconectada, rotação de credenciais).

## 14. Custos e requisitos de plano

Vários recursos dependem de nível de plano pago: Auditoria de Plataforma da Supabase (Team+), webhooks da Vercel (Pro/Enterprise a confirmar), chaves de administrador de organização da Anthropic e da OpenAI para relatórios de custo agregado. Nenhum desses upgrades é necessário para a primeira fatia vertical.

## 15. Decisões em aberto

22 decisões estão registradas com recomendação, opções e responsável — todas marcadas como **decisão do dono da KSP (Kauan)**, nunca decididas por conta própria neste plano. Sete delas precisam ser resolvidas antes de iniciar a Fase 0.

## 16. Architecture Decision Records

15 ADRs cobrindo as escolhas arquiteturalmente relevantes (GitHub App vs. token pessoal, webhook vs. polling, retenção de dados brutos, arquitetura de fila, modelo de eventos canônico, armazenamento de sessões de IA, retenção de transcrição, modelo de auditoria, mecanismo de auditoria da Supabase, armazenamento de segredos, modelo de confiança de correlação, modelo de leitura da linha do tempo, arquitetura de geração de relatórios, escopo da primeira fatia vertical). Todas com status **Proposto** — nenhuma foi aceita, pois aceitar exige decisão do dono da KSP.

## 17. Veredito de prontidão

**CONDICIONALMENTE PRONTO** (`CONDITIONALLY_READY`). O plano está completo, consistente e todo citado com evidências. Não está "pronto para a primeira fatia vertical" apenas porque sete decisões (retenção de dados brutos, armazenamento de segredos, dual-write de auditoria, versionamento da taxonomia de eventos, escolha do projeto-piloto, política de rotação de credenciais, e a escolha de fila/polling) ainda dependem da aprovação de Kauan. Não é "não pronto" — nenhuma pesquisa ou desenho adicional é necessário, apenas a decisão do dono do negócio sobre pontos já claramente recomendados.

## 18. Próximo passo concreto

Kauan revisa o registro de decisões em `12_OPEN_QUESTIONS_AND_DECISIONS.md`, aceita ou ajusta cada recomendação. Assim que os itens marcados "antes da Fase 0" estiverem resolvidos, a Fase 0 do roteiro de implementação (`09_IMPLEMENTATION_ROADMAP.md`) pode começar — como um trabalho de implementação separado, em sua própria branch, seguindo o mesmo padrão de vertical slice já usado no resto da reconstrução do KSP OS.
