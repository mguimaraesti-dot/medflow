import type { CashRegisterDay } from "./cash-register-day.entity";

export interface CreateCashRegisterDayInput {
  organizationId: string;
  date: Date;
  openingBalance: string; // valor de entrada, convertido para Decimal só na infraestrutura
  openedByUserId: string;
}

export interface CloseCashRegisterDayInput {
  totalIn: string;
  totalOut: string;
  closingBalance: string;
  closedByUserId: string;
}

export interface ReopenCashRegisterDayInput {
  reopenedByUserId: string;
  reason: string;
}

/**
 * Contrato do repositório de CashRegisterDay. A implementação concreta
 * (Prisma) entra em `infrastructure/` quando a feature for de fato
 * construída (Task 5) — aqui só o contrato, para os use cases poderem
 * ser escritos e testados (com mock) antes disso.
 */
export interface CashRegisterDayRepository {
  findById(id: string): Promise<CashRegisterDay | null>;

  findByOrganizationAndDate(
    organizationId: string,
    date: Date,
  ): Promise<CashRegisterDay | null>;

  /** Último caixa fechado da organização, usado para herdar o saldo inicial do próximo dia. */
  findLastClosed(organizationId: string): Promise<CashRegisterDay | null>;

  findOpenByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null>;

  create(data: CreateCashRegisterDayInput): Promise<CashRegisterDay>;

  close(id: string, data: CloseCashRegisterDayInput): Promise<CashRegisterDay>;

  reopen(
    id: string,
    data: ReopenCashRegisterDayInput,
  ): Promise<CashRegisterDay>;
}
