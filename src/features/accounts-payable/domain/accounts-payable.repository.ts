import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  AccountsPayable,
  PayableStatus,
  PaymentConfirmationSource,
  PaymentOrigin,
} from "./accounts-payable.entity";
import type {
  AccountsPayableSummary,
  AccountsPayableSummaryBucket,
} from "./accounts-payable-summary.entity";

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
  paymentOrigin?: PaymentOrigin;
  recurringBillId?: string;
  occurrenceNumber?: number;
  createdByUserId: string;
  /** Omitido = usa o default do banco (5). Dias antes do vencimento em que o lembrete de WhatsApp começa a ser enviado. */
  reminderDaysBefore?: number;
}

export interface ListAccountsPayableFilter {
  organizationId: string;
  status?: PayableStatus;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  /** Filtra por data de pagamento (`paidAt`), não vencimento — usado pelo relatório "Contas Pagas" (Central de Relatórios), onde o período selecionado é sobre quando o pagamento aconteceu. */
  paidAtFrom?: Date;
  paidAtTo?: Date;
  supplierId?: string;
  categoryId?: string;
  /** Só as ocorrências de uma recorrência — usado pelo Drawer "Ver Ocorrências"/"Linha do Tempo". */
  recurringBillId?: string;
  /** Filtro "Recorrência" da tela: só recorrentes ou só avulsas. */
  recurringOnly?: "RECURRING" | "NON_RECURRING";
  /** Busca livre por descrição (contains, case-insensitive). */
  search?: string;
  /**
   * `false` (padrão) — só contas não excluídas. `true` — só as excluídas
   * (soft delete), usado exclusivamente pela tela "Contas Excluídas".
   */
  deletedOnly?: boolean;
}

/**
 * `paymentOrigin`/`amount`/`organizationId` vêm do próprio `payable` já
 * carregado no use case — repassados aqui pra o repositório decidir se
 * cria um `SafeMovement` (COFRE) e achar o Cofre certo, sem precisar
 * buscar a conta de novo. `safeBalance` (só usado quando `paymentOrigin`
 * é "COFRE") é o saldo já calculado e validado no use case — reaproveitado
 * aqui em vez de recalculado do zero dentro da transação (a proteção
 * contra corrida entre pagamentos concorrentes passa a ser um `SELECT ...
 * FOR UPDATE` na linha do Cofre, não um recálculo completo).
 */
export interface MarkAsPaidInput {
  paidByUserId: string;
  paidVia: PaymentConfirmationSource;
  paymentOrigin: PaymentOrigin;
  amount: string;
  organizationId: string;
  safeBalance?: string;
}

/**
 * Campos editáveis via `update()` — nunca inclui `status`: ciclo de vida
 * continua imutável fora de pagar/cancelar. `amount` é editável (o use
 * case já garante que só chega aqui enquanto a conta está PENDENTE —
 * `PayableAlreadyProcessedError` bloqueia fora disso). Serve tanto pra
 * edição de contas recorrentes (fornecedor/categoria/vencimento/valor/
 * observação podem mudar entre ocorrências) quanto pra corrigir/completar
 * dados de pagamento (`paymentOrigin`, `barcode`, `pixKey`) depois do
 * cadastro inicial.
 */
export interface UpdateAccountsPayableInput {
  supplierId: string;
  categoryId: string;
  description: string;
  amount: string; // convertido para Decimal só na infraestrutura
  dueDate: Date;
  paymentOrigin: PaymentOrigin;
  barcode?: string;
  pixKey?: string;
}

export interface SoftDeleteAccountsPayableInput {
  deletedByUserId: string;
  deletionReason?: string;
}

/**
 * Campos propagados em lote para as próximas ocorrências PENDENTES de uma
 * recorrência (`scope: "SERIES"`) — nunca inclui `dueDate` (cada ocorrência
 * mantém seu próprio vencimento, só o valor de uma única linha varia).
 */
export interface UpdateManyForSeriesInput {
  supplierId: string;
  categoryId: string;
  description: string;
  paymentOrigin: PaymentOrigin;
}

/**
 * Contrato do repositório de AccountsPayable. `update()` é deliberadamente
 * restrito (ver `UpdateAccountsPayableInput`) — `status` continua só
 * mudando via pagar/cancelar, nunca editado diretamente.
 */
export interface AccountsPayableRepository {
  findById(id: string): Promise<AccountsPayable | null>;

  /** Usado pelo webhook da Z-API — o clique no botão "Pago" só carrega o `publicToken`, nunca o id interno. */
  findByPublicToken(publicToken: string): Promise<AccountsPayable | null>;

  list(
    filter: ListAccountsPayableFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<AccountsPayable>>;

  create(data: CreateAccountsPayableInput): Promise<AccountsPayable>;

  /**
   * Insere todas as ocorrências de uma recorrência num único INSERT em lote
   * (`createMany`, atômico) em vez de uma `create()` por ocorrência — evita
   * até ~240 idas sequenciais ao banco na criação de uma série longa.
   * Retorna as linhas criadas (já com joins), ordenadas por occurrenceNumber.
   */
  createMany(data: CreateAccountsPayableInput[]): Promise<AccountsPayable[]>;

  update(
    id: string,
    data: UpdateAccountsPayableInput,
  ): Promise<AccountsPayable>;

  /**
   * Propaga os mesmos campos (fornecedor/categoria/descrição/origem) para
   * várias ocorrências de uma vez (`updateMany`) — usado ao editar uma
   * recorrência com `scope: "SERIES"`. Retorna a quantidade de linhas
   * afetadas.
   */
  updateManyForSeries(
    ids: string[],
    data: UpdateManyForSeriesInput,
  ): Promise<number>;

  /** Todas as ocorrências de uma recorrência, ordenadas por occurrenceNumber — usado pro Drawer (X de Y) e pra propagar edição/cancelamento às próximas. */
  listByRecurringBill(recurringBillId: string): Promise<AccountsPayable[]>;

  /**
   * Ocorrências reais (já geradas) de várias recorrências dentro de um
   * intervalo de datas — usado pela "Programação" mensal (tela de
   * planejamento de Recorrências). Uma única consulta em lote em vez de
   * uma por recorrência (evita N+1).
   */
  listByRecurringBillIdsInRange(
    recurringBillIds: string[],
    dueDateFrom: Date,
    dueDateTo: Date,
  ): Promise<AccountsPayable[]>;

  /**
   * Só marca o ciclo de vida (Pendente -> Pago) — MVP atual não faz
   * controle financeiro (sem caixa, sem forma de pagamento, sem lançamento
   * de Fluxo de Caixa vinculado). Ver decisão de escopo do refinamento UX.
   */
  markAsPaid(id: string, data: MarkAsPaidInput): Promise<AccountsPayable>;

  cancel(id: string): Promise<AccountsPayable>;

  /**
   * Cancela várias ocorrências de uma vez (`updateMany`) — usado ao encerrar
   * uma recorrência (`scope: "SERIES"`), substitui o loop de `cancel()` por
   * ocorrência. Retorna a quantidade de linhas afetadas.
   */
  cancelMany(ids: string[]): Promise<number>;

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

  /** Soma agregada de contas pagas dentro de um intervalo de `paidAt` — usado pelo card "Pagamentos" do Fluxo Financeiro do Dashboard. */
  sumPaidByDateRange(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<AccountsPayableSummaryBucket>;

  /**
   * Candidatas ao lembrete de WhatsApp (cron diário) — só PENDENTES e
   * não excluídas. O filtro de janela (`hoje >= dueDate -
   * reminderDaysBefore`) e "já lembrado hoje" acontece em código no
   * use case, não aqui (mesmo padrão de agregação em código já usado
   * no projeto).
   */
  listPendingForReminders(organizationId: string): Promise<AccountsPayable[]>;

  /** Marca que o lembrete foi enviado agora — evita reenviar mais de uma vez no mesmo dia. */
  touchReminderSent(id: string, sentAt: Date): Promise<void>;
}
