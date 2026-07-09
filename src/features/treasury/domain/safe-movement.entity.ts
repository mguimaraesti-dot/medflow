import { Prisma } from "@prisma/client";

export type SafeMovementType =
  | "FUNDING"
  | "SANGRIA"
  | "CASH_REGISTER_HANDOFF"
  | "MANUAL_ADJUSTMENT"
  | "ACCOUNTS_PAYABLE_PAYMENT";

/** Só `CASH_REGISTER_HANDOFF` nasce `PENDING` (fechamento de caixa aguardando conferência do Gerente) — os demais tipos já nascem `CONFIRMED`. */
export type SafeMovementStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

/**
 * Ledger do Cofre — `amount`/`type`/os `relatedX` nunca mudam depois de
 * criados e a linha nunca é excluída fisicamente (mesmo princípio de
 * `CashFlowEntry`, Coding Standards 18.1). A única exceção é a transição
 * de `status` (via confirm-safe-movement/cancel-safe-movement), exclusiva
 * de movimentações `PENDING`. `amount` é sempre positivo, exceto em
 * `MANUAL_ADJUSTMENT` (único tipo sem direção implícita pelo próprio
 * `type` — ver ADR Seção 6.1/item 3 das decisões confirmadas).
 */
export interface SafeMovement {
  id: string;
  organizationId: string;
  safeId: string;
  type: SafeMovementType;
  amount: Prisma.Decimal;
  status: SafeMovementStatus;
  relatedCashRegisterDayId: string | null;
  performedByUserId: string;
  /** Denormalizado só pra exibição (coluna "Responsável" da Tesouraria) — via join na infraestrutura. */
  performedByUserName: string;
  reason: string | null;
  confirmedByUserId: string | null;
  /** Denormalizado só pra exibição — via join na infraestrutura. */
  confirmedByUserName: string | null;
  confirmedAt: Date | null;
  cancelledByUserId: string | null;
  /** Denormalizado só pra exibição — via join na infraestrutura. */
  cancelledByUserName: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  /** Denormalizado da Categoria da Conta a Pagar vinculada (só em `ACCOUNTS_PAYABLE_PAYMENT`) — usado na coluna "Categoria" da tabela. */
  categoryName: string | null;
  createdAt: Date;
}
