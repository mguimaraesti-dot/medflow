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
  occurrenceNumber?: number;
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
  /**
   * `false` (padrão) — só contas não excluídas. `true` — só as excluídas
   * (soft delete), usado exclusivamente pela tela "Contas Excluídas".
   */
  deletedOnly?: boolean;
}

export interface MarkAsPaidInput {
  paidByUserId: string;
  paidVia: PaymentConfirmationSource;
}

/**
 * Campos editáveis via `update()` — de propósito, nunca inclui `amount` nem
 * `status`: valor e ciclo de vida continuam imutáveis fora de
 * pagar/cancelar. Só existe pra suportar a edição de contas recorrentes
 * (fornecedor/categoria/vencimento/observação podem mudar entre ocorrências).
 */
export interface UpdateAccountsPayableInput {
  supplierId: string;
  categoryId: string;
  description: string;
  dueDate: Date;
}

export interface SoftDeleteAccountsPayableInput {
  deletedByUserId: string;
  deletionReason?: string;
}

/**
 * Contrato do repositório de AccountsPayable. `update()` é deliberadamente
 * restrito (ver `UpdateAccountsPayableInput`) — valor e status continuam só
 * mudando via pagar/cancelar, nunca editados diretamente.
 */
export interface AccountsPayableRepository {
  findById(id: string): Promise<AccountsPayable | null>;

  list(
    filter: ListAccountsPayableFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<AccountsPayable>>;

  create(data: CreateAccountsPayableInput): Promise<AccountsPayable>;

  update(
    id: string,
    data: UpdateAccountsPayableInput,
  ): Promise<AccountsPayable>;

  /** Todas as ocorrências de uma recorrência, ordenadas por occurrenceNumber — usado pro Drawer (X de Y) e pra propagar edição/cancelamento às próximas. */
  listByRecurringBill(recurringBillId: string): Promise<AccountsPayable[]>;

  /**
   * Só marca o ciclo de vida (Pendente -> Pago) — MVP atual não faz
   * controle financeiro (sem caixa, sem forma de pagamento, sem lançamento
   * de Fluxo de Caixa vinculado). Ver decisão de escopo do refinamento UX.
   */
  markAsPaid(id: string, data: MarkAsPaidInput): Promise<AccountsPayable>;

  cancel(id: string): Promise<AccountsPayable>;

  /** Soft delete — nunca remove a linha. Só chamado depois de validar (use-case) que a conta está PENDENTE e ainda não excluída. */
  softDelete(
    id: string,
    data: SoftDeleteAccountsPayableInput,
  ): Promise<AccountsPayable>;

  /** Reverte o soft delete — limpa deletedAt/deletedByUserId/deletionReason. */
  restore(id: string): Promise<AccountsPayable>;

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
