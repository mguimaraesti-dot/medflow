/**
 * Catálogo de permissões do MedFlow.
 *
 * Este é o único lugar do projeto onde a relação Role -> Permission é
 * declarada. O seed usa este arquivo para popular o banco; o
 * rbac.middleware (Task 4) vai usar o mesmo arquivo para checar
 * autorização em runtime. Evita ter a mesma regra duplicada em dois
 * lugares (Coding Standards, item de DRY).
 */

export const PERMISSIONS = {
  CASH_FLOW_CREATE: "cashflow:create",
  CASH_FLOW_REVERSE: "cashflow:reverse",
  CASH_FLOW_READ: "cashflow:read",

  CASH_REGISTER_OPEN: "cash-register:open",
  CASH_REGISTER_CLOSE: "cash-register:close",
  CASH_REGISTER_REOPEN: "cash-register:reopen",
  CASH_REGISTER_READ: "cash-register:read",

  PAYABLE_CREATE: "payable:create",
  PAYABLE_PAY: "payable:pay",
  PAYABLE_READ: "payable:read",
  /** Excluir (soft delete) e restaurar contas — exclusivo de Administrador. */
  PAYABLE_DELETE: "payable:delete",

  TREASURY_SANGRIA: "treasury:sangria",
  TREASURY_MANUAL_ADJUSTMENT: "treasury:manual-adjustment",
  /** Confirma ou cancela a conferência gerencial do fechamento de caixa (CASH_REGISTER_HANDOFF pendente) — nunca Secretária. */
  TREASURY_CONFIRM_MOVEMENT: "treasury:confirm-movement",

  USERS_MANAGE: "users:manage",

  DASHBOARD_READ: "dashboard:read",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Mapeamento Role -> Permissions, conforme decidido em
 * docs/sprints/MedFlow-Sprint1-Revisada.md (US03 a US08), com o ajuste
 * de autonomia da Secretária no ciclo do caixa (decisão explícita do
 * usuário — dupla conferência do Motor de Tesouraria removida):
 * - Secretária lança, cadastra, e agora também abre/fecha/reabre o
 *   caixa sozinha (reabertura sempre com justificativa obrigatória) —
 *   não confirma pagamento nem estorna lançamentos.
 * - Financeiro/Proprietário lançam, estornam, fecham caixa e confirmam
 *   pagamento.
 * - Admin gerencia usuários e também pode reabrir o caixa.
 * - Contador só lê (relatórios, Sprint 3).
 * - Proprietário (Gerente, na Gestão de Acessos) também gerencia
 *   usuários — mapeamento explícito do pedido de Gestão de Acessos:
 *   "Gerente" cria/edita usuários e vê relatórios, sem as funções de
 *   manutenção do sistema que só o Admin tem.
 */
export const ROLE_PERMISSIONS: Record<
  "ADMIN" | "OWNER" | "SECRETARY" | "FINANCE" | "ACCOUNTANT",
  PermissionKey[]
> = {
  ADMIN: [
    PERMISSIONS.CASH_FLOW_CREATE,
    PERMISSIONS.CASH_FLOW_REVERSE,
    PERMISSIONS.CASH_FLOW_READ,
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.CASH_REGISTER_REOPEN,
    PERMISSIONS.CASH_REGISTER_READ,
    PERMISSIONS.PAYABLE_CREATE,
    PERMISSIONS.PAYABLE_PAY,
    PERMISSIONS.PAYABLE_READ,
    PERMISSIONS.PAYABLE_DELETE,
    PERMISSIONS.TREASURY_SANGRIA,
    PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT,
    PERMISSIONS.TREASURY_CONFIRM_MOVEMENT,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.DASHBOARD_READ,
  ],
  OWNER: [
    PERMISSIONS.CASH_FLOW_CREATE,
    PERMISSIONS.CASH_FLOW_REVERSE,
    PERMISSIONS.CASH_FLOW_READ,
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.CASH_REGISTER_READ,
    PERMISSIONS.PAYABLE_CREATE,
    PERMISSIONS.PAYABLE_PAY,
    PERMISSIONS.PAYABLE_READ,
    PERMISSIONS.TREASURY_SANGRIA,
    PERMISSIONS.TREASURY_CONFIRM_MOVEMENT,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.DASHBOARD_READ,
  ],
  FINANCE: [
    PERMISSIONS.CASH_FLOW_CREATE,
    PERMISSIONS.CASH_FLOW_REVERSE,
    PERMISSIONS.CASH_FLOW_READ,
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.CASH_REGISTER_READ,
    PERMISSIONS.PAYABLE_CREATE,
    PERMISSIONS.PAYABLE_PAY,
    PERMISSIONS.PAYABLE_READ,
    PERMISSIONS.TREASURY_SANGRIA,
    PERMISSIONS.TREASURY_CONFIRM_MOVEMENT,
    PERMISSIONS.DASHBOARD_READ,
  ],
  SECRETARY: [
    PERMISSIONS.CASH_FLOW_CREATE,
    PERMISSIONS.CASH_FLOW_READ,
    PERMISSIONS.CASH_REGISTER_OPEN,
    PERMISSIONS.CASH_REGISTER_CLOSE,
    PERMISSIONS.CASH_REGISTER_REOPEN,
    PERMISSIONS.CASH_REGISTER_READ,
    PERMISSIONS.PAYABLE_CREATE,
    PERMISSIONS.PAYABLE_READ,
    PERMISSIONS.DASHBOARD_READ,
  ],
  ACCOUNTANT: [
    PERMISSIONS.CASH_FLOW_READ,
    PERMISSIONS.CASH_REGISTER_READ,
    PERMISSIONS.PAYABLE_READ,
    PERMISSIONS.DASHBOARD_READ,
  ],
};

/**
 * Rótulo em português exibido ao usuário (Gestão de Acessos, sidebar)
 * — nunca usado para autorização, só apresentação. Os 5 perfis
 * continuam existindo no banco (`RoleName`); isso não os renomeia,
 * só troca o texto mostrado. Perfis fora de `VISIBLE_ROLE_NAMES` não
 * têm rótulo aqui de propósito — não aparecem no seletor da tela de
 * Usuários (pedido explícito: "os demais ocultar").
 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OWNER: "Gerente",
  SECRETARY: "Secretária",
};

export function getRoleLabel(roleName: string): string {
  return ROLE_LABELS[roleName] ?? roleName;
}

/** Únicos perfis oferecidos no seletor de "Novo Usuário"/"Editar Usuário" — Financeiro e Contador continuam existindo (usuários antigos mantêm o perfil), só saem da lista de escolha. */
export const VISIBLE_ROLE_NAMES = ["ADMIN", "OWNER", "SECRETARY"] as const;
