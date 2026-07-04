# MedFlow — ROADMAP

> Documento curto. Objetivo único: impedir que ideias futuras contaminem o escopo do MVP em desenvolvimento.

## Sequência confirmada (pós-Sprint 2)

Decisão registrada em `docs/decisions/adr-tesouraria.md`: Design Pass e Motor de Tesouraria não competem entre si — Tesouraria é backend puro (sem tela), então entra antes do Design Pass sem atrapalhá-lo.

1. **Sprint 2 — Contas a Pagar** (em finalização)
2. **Task 6A — Motor de Tesouraria** (Caixa/Cofre/Conta Bancária futura; ver ADR) — schema, migration, use cases, testes. Sem tela.
3. **Design Pass** — identidade visual consistente em cima de tudo que já existe (Login, Dashboard, Fluxo de Caixa, Contas a Pagar). Só faz sentido depois de existir variedade real de telas.
4. **Task 6B — Tela de Tesouraria** — já nasce em cima do design consolidado.
5. **Sprint 3 — Relatórios + Fechamento** (inclui o Relatório Diário com os campos novos do Cofre: `countedAmount`, `receivedAmount`, `confirmedDifference`)

## V1 (em desenvolvimento)
- ⬜ Fluxo de Caixa (Sprint 1)
- ⬜ Contas a Pagar (Sprint 2)
- ⬜ Dashboard Financeiro (Sprint 1, evolui na 2)
- ⬜ Relatórios + Fechamento (Sprint 3)

## V1.1
- ⬜ Automação WhatsApp (confirmação de pagamento via link)
- ⬜ Exportação em PDF
- ⬜ Exportação em Excel

## V1.2
- ⬜ Contas a Receber
- ⬜ Agenda Financeira como módulo dedicado (hoje é view sobre AccountsPayable)
- ⬜ Aprovação de pagamento em múltiplos níveis

## V2
- ⬜ Multiempresa operacional (a estrutura de dados já existe desde a V1)
- ⬜ Centro de Custos
- ⬜ Controle Bancário (BankAccount, saldo por conta)
- ⬜ Conciliação Bancária
- ⬜ Open Finance / Importação OFX

## V3
- ⬜ BI / Indicadores avançados
- ⬜ Previsão de caixa
- ⬜ IA aplicada a categorização automática de lançamentos
- ⬜ Aplicativo mobile nativo

---

## Backlog (sem versão definida)

Ideias que surgirem durante qualquer Sprint entram aqui primeiro. Só recebem uma versão (V1.2, V2, V3...) após revisão de produto — nunca direto na sprint em andamento.

- Integração com ERP
- OCR de boletos
- Leitura automática de DANFE
- Aprovação por biometria
- Dashboard TV (modo apresentação para recepção/sala)
- Notificações push
- Integração direta com bancos
- API pública

---

Qualquer ideia nova durante a Sprint 1/2 entra aqui, na versão correspondente — não vira discussão de escopo do MVP em andamento.
