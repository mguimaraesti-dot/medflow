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

  USERS_MANAGE: "users:manage",

  DASHBOARD_READ: "dashboard:read",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Mapeamento Role -> Permissions, conforme decidido em
 * docs/sprints/MedFlow-Sprint1-Revisada.md (US03 a US08):
 * - Secretária lança e cadastra, mas não confirma pagamento nem
 *   fecha/estorna caixa.
 * - Financeiro/Proprietário lançam, estornam, fecham caixa e confirmam
 *   pagamento.
 * - Admin reabre caixa e gerencia usuários.
 * - Contador só lê (relatórios, Sprint 3).
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
    PERMISSIONS.DASHBOARD_READ,
  ],
  SECRETARY: [
    PERMISSIONS.CASH_FLOW_CREATE,
    PERMISSIONS.CASH_FLOW_READ,
    PERMISSIONS.CASH_REGISTER_OPEN,
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
