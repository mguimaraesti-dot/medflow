import { Prisma } from "@prisma/client";

export type SafeMovementType =
  | "FUNDING"
  | "SANGRIA"
  | "CASH_REGISTER_HANDOFF"
  | "MANUAL_ADJUSTMENT"
  | "ACCOUNTS_PAYABLE_PAYMENT";

/**
 * Ledger do Cofre — nunca tem update/delete no repositório, só create e
 * leitura (mesmo princípio de `CashFlowEntry`, Coding Standards 18.1).
 * `amount` é sempre positivo, exceto em `MANUAL_ADJUSTMENT` (único tipo
 * sem direção implícita pelo próprio `type` — ver ADR Seção 6.1/item 3
 * das decisões confirmadas).
 */
export interface SafeMovement {
  id: string;
  organizationId: string;
  safeId: string;
  type: SafeMovementType;
  amount: Prisma.Decimal;
  relatedCashRegisterDayId: string | null;
  performedByUserId: string;
  /** Denormalizado só pra exibição (coluna "Responsável" da Tesouraria) — via join na infraestrutura. */
  performedByUserName: string;
  reason: string | null;
  createdAt: Date;
}
