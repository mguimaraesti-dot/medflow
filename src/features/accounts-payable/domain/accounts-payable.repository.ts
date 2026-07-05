import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type { CreateCashFlowEntryInput } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CashFlowEntry } from "@/features/cash-flow/domain/cash-flow-entry.entity";
import type { AccountsPayable, PayableStatus } from "./accounts-payable.entity";
import type { AccountsPayableSummary } from "./accounts-payable-summary.entity";

export interface CreateAccountsPayableInput {
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: string; // convertido para Decimal só na infraestrutura
  dueDate: Date;
  barcode?: string;
  digitableLine?: string;
  pixKey?: string;
  qrCodeUrl?: string;
  boletoPdfUrl?: string;
  recurringBillId?: string;
  createdByUserId: string;
}

export interface ListAccountsPayableFilter {
  organizationId: string;
  status?: PayableStatus;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  supplierId?: string;
  categoryId?: string;
  /** Busca livre por descrição (contains, case-insensitive). */
  search?: string;
}

export interface MarkAsPaidInput {
  paidByUserId: string;
  cashFlowEntry: CreateCashFlowEntryInput;
}

/**
 * Contrato do repositório de AccountsPayable. Nunca tem `update` — como
 * em todo o domínio financeiro, a correção de um cadastro é sempre
 * cancelar (nunca editar um valor/vencimento já registrado).
 */
export interface AccountsPayableRepository {
  findById(id: string): Promise<AccountsPayable | null>;

  list(
    filter: ListAccountsPayableFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<AccountsPayable>>;

  create(data: CreateAccountsPayableInput): Promise<AccountsPayable>;

  /**
   * Grava o pagamento e o lançamento de caixa correspondente na mesma
   * transação (mesmo princípio de atomicidade já usado em
   * `CashFlowEntryRepository.reverse`) — nunca duas chamadas separadas,
   * que arriscariam estado parcial (conta paga sem lançamento, ou
   * vice-versa).
   */
  markAsPaid(
    id: string,
    data: MarkAsPaidInput,
  ): Promise<{ payable: AccountsPayable; cashFlowEntry: CashFlowEntry }>;

  cancel(id: string): Promise<AccountsPayable>;

  /**
   * Agregação para os cards de KPI da tela — particiona por
   * dueToday/upcoming/overdue/paid dentro do período informado; `total`
   * é a soma dos 4. Sempre calculado no backend (Coding Standards, item 15).
   */
  getSummary(
    organizationId: string,
    period: { dueDateFrom?: Date; dueDateTo?: Date },
  ): Promise<AccountsPayableSummary>;
}
