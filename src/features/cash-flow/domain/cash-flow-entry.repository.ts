import type { Prisma } from "@prisma/client";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  CashFlowEntry,
  CashFlowEntryType,
} from "./cash-flow-entry.entity";

export interface CreateCashFlowEntryInput {
  organizationId: string;
  cashRegisterDayId: string;
  type: CashFlowEntryType;
  amount: string; // convertido para Decimal só na infraestrutura
  description?: string;
  occurredAt?: Date;
  categoryId: string;
  paymentMethodId: string;
  accountsPayableId?: string;
  createdByUserId: string;
  patientName?: string;
  withdrawalReason?: string;
}

export interface ListCashFlowEntriesFilter {
  organizationId: string;
  cashRegisterDayId?: string;
  type?: CashFlowEntryType;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CashFlowEntrySums {
  totalIn: string;
  totalOut: string;
}

/** Projeção usada pelos insights (origem das receitas por categoria + por hora). */
export interface CashFlowEntryInsightProjection {
  type: CashFlowEntryType;
  amount: Prisma.Decimal;
  occurredAt: Date;
  categoryId: string;
}

/**
 * Contrato do repositório de CashFlowEntry. Deliberadamente NÃO tem
 * `update`/`delete` — reforça no nível de tipo a regra de imutabilidade
 * (Coding Standards, item 13.2). Correção é sempre `reverse`.
 */
export interface CashFlowEntryRepository {
  findById(id: string): Promise<CashFlowEntry | null>;

  list(
    filter: ListCashFlowEntriesFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<CashFlowEntry>>;

  create(data: CreateCashFlowEntryInput): Promise<CashFlowEntry>;

  /** Marca `isReversed = true` no lançamento original e cria o lançamento de estorno, na mesma transação. */
  reverse(
    entryId: string,
    reversedByUserId: string,
    description?: string,
  ): Promise<{ original: CashFlowEntry; reversal: CashFlowEntry }>;

  /** Soma agregada (calculada no backend — Coding Standards, item 15) usada para fechar o caixa e alimentar o Dashboard. */
  sumByCashRegisterDay(cashRegisterDayId: string): Promise<CashFlowEntrySums>;

  /** Mesma soma, mas só de lançamentos com `paymentMethod.isCash = true` — usada no cálculo de Dinheiro Esperado (Motor de Tesouraria). */
  sumCashOnlyByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<CashFlowEntrySums>;

  /** Contagem de lançamentos estornados no período — usada pelo alerta de estornos do dia. */
  countReversedToday(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<number>;

  /** Projeção (type/amount/occurredAt/categoryId) de todos os lançamentos de um dia de caixa — usada pelos insights. */
  listByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<CashFlowEntryInsightProjection[]>;
}
