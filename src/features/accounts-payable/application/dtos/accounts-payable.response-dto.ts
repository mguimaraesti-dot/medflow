import { toMoneyString } from "@/shared/lib/money";
import { todayDateOnlyBR } from "@/shared/lib/format";
import { reminderWindowStart } from "../../domain/reminder-window";
import type {
  AccountsPayable,
  PayableStatus,
  PaymentConfirmationSource,
  PaymentOrigin,
} from "../../domain/accounts-payable.entity";

/**
 * Estado do lembrete de WhatsApp, calculado (nunca persistido) a partir
 * de `reminderEnabled`/`reminderDaysBefore`/`lastReminderSentAt` +
 * status da conta — NÃO é um booleano "enviado/não enviado" de
 * propósito: uma conta fora da janela de antecedência nunca foi
 * enviada e isso é normal, não uma pendência (ver `NOT_DUE` abaixo).
 * - `SENT`: já foi enviado ao menos uma vez (`lastReminderSentAt`
 *   preenchido) — checado primeiro porque é um fato histórico que não
 *   deixa de ser verdade se a conta for paga/cancelada depois.
 * - `NOT_APPLICABLE`: nunca foi enviado e nunca vai ser cobrado —
 *   lembrete desabilitado, ou conta não está mais PENDENTE (paga/
 *   cancelada). Estado próprio (não cai em `NOT_DUE`) porque `NOT_DUE`
 *   implica "ainda vai acontecer", o que é falso aqui.
 * - `PENDING_SEND`: dentro da janela, habilitado, ainda PENDENTE e
 *   nunca enviado — o único estado que representa uma pendência real.
 * - `NOT_DUE`: fora da janela (`hoje < dueDate - reminderDaysBefore`).
 */
export type AccountsPayableReminderStatus =
  "NOT_DUE" | "PENDING_SEND" | "SENT" | "NOT_APPLICABLE";

export interface AccountsPayableResponseDTO {
  id: string;
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: string;
  dueDate: Date;
  barcode: string | null;
  digitableLine: string | null;
  pixKey: string | null;
  qrCodeUrl: string | null;
  boletoPdfUrl: string | null;
  status: PayableStatus;
  /** Igual a `status`, exceto quando PENDING e já vencida — nunca persistido, só calculado aqui. */
  displayStatus: PayableStatus;
  paymentOrigin: PaymentOrigin;
  recurringBillId: string | null;
  occurrenceNumber: number | null;
  createdByUserId: string;
  createdByUserName: string;
  paidByUserId: string | null;
  paidByUserName: string | null;
  paidAt: Date | null;
  paidVia: PaymentConfirmationSource | null;
  /** Nº da movimentação do Cofre gerada ao pagar via COFRE — `null` sempre que `paymentOrigin` for BANCO ou a conta ainda não foi paga. */
  paidSafeMovementId: string | null;
  /** Quantidade de anexos reais (Google Drive) vinculados — não inclui o boleto legado (`boletoPdfUrl`). */
  attachmentsCount: number;
  /** Interruptor por conta do lembrete de WhatsApp. */
  reminderEnabled: boolean;
  /** Dias antes do vencimento em que o lembrete de WhatsApp começa a ser enviado. */
  reminderDaysBefore: number;
  /** Última vez que o lembrete de WhatsApp foi enviado — `null` se nunca. */
  lastReminderSentAt: Date | null;
  /** Estado do lembrete (ver `AccountsPayableReminderStatus`) — calculado, não persistido. */
  reminderStatus: AccountsPayableReminderStatus;
  deletedAt: Date | null;
  deletedByUserName: string | null;
  deletionReason: string | null;
  createdAt: Date;
}

export function toAccountsPayableResponseDTO(
  payable: AccountsPayable,
  referenceDate: Date = new Date(),
): AccountsPayableResponseDTO {
  // "Hoje" no calendário de Brasília, não em UTC (ver todayDateOnlyBR)
  // — senão uma conta com vencimento hoje vira "Vencida" horas antes da
  // meia-noite real em Brasília. "Vencida" só a partir do dia seguinte
  // ao vencimento.
  const referenceDay = todayDateOnlyBR(referenceDate);
  const displayStatus: PayableStatus =
    payable.status === "PENDING" && payable.dueDate < referenceDay
      ? "OVERDUE"
      : payable.status;

  const reminderStatus: AccountsPayableReminderStatus =
    payable.lastReminderSentAt !== null
      ? "SENT"
      : payable.status !== "PENDING" || !payable.reminderEnabled
        ? "NOT_APPLICABLE"
        : referenceDay >=
            reminderWindowStart(payable.dueDate, payable.reminderDaysBefore)
          ? "PENDING_SEND"
          : "NOT_DUE";

  return {
    id: payable.id,
    organizationId: payable.organizationId,
    supplierId: payable.supplierId,
    categoryId: payable.categoryId,
    description: payable.description,
    amount: toMoneyString(payable.amount) as string,
    dueDate: payable.dueDate,
    barcode: payable.barcode,
    digitableLine: payable.digitableLine,
    pixKey: payable.pixKey,
    qrCodeUrl: payable.qrCodeUrl,
    boletoPdfUrl: payable.boletoPdfUrl,
    status: payable.status,
    displayStatus,
    paymentOrigin: payable.paymentOrigin,
    recurringBillId: payable.recurringBillId,
    occurrenceNumber: payable.occurrenceNumber,
    createdByUserId: payable.createdByUserId,
    createdByUserName: payable.createdByUserName,
    paidByUserId: payable.paidByUserId,
    paidByUserName: payable.paidByUserName,
    paidAt: payable.paidAt,
    paidVia: payable.paidVia,
    paidSafeMovementId: payable.paidSafeMovementId,
    attachmentsCount: payable.attachmentsCount,
    reminderEnabled: payable.reminderEnabled,
    reminderDaysBefore: payable.reminderDaysBefore,
    lastReminderSentAt: payable.lastReminderSentAt,
    reminderStatus,
    deletedAt: payable.deletedAt,
    deletedByUserName: payable.deletedByUserName,
    deletionReason: payable.deletionReason,
    createdAt: payable.createdAt,
  };
}
