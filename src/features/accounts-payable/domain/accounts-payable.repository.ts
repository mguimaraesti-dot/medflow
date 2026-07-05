import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  AccountsPayable,
  PayableStatus,
  PaymentConfirmationSource,
} from "./accounts-payable.entity";
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
  paidVia: PaymentConfirmationSource;
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
   * Só marca o ciclo de vida (Pendente -> Pago) — MVP atual não faz
   * controle financeiro (sem caixa, sem forma de pagamento, sem lançamento
   * de Fluxo de Caixa vinculado). Ver decisão de escopo do refinamento UX.
   */
  markAsPaid(id: string, data: MarkAsPaidInput): Promise<AccountsPayable>;

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
