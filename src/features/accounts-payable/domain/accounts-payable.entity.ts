import type { Prisma } from "@prisma/client";

export type PayableStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

/** "WHATSAPP" é gravado pelo webhook da Z-API ao confirmar pagamento por clique no botão "Pago" (ver handle-zapi-webhook.use-case.ts). */
export type PaymentConfirmationSource = "SYSTEM" | "WHATSAPP";

/** Fonte do dinheiro escolhida no cadastro/edição — distinto de `paidVia` (canal de confirmação). `COFRE` debita o saldo da Tesouraria ao confirmar o pagamento. */
export type PaymentOrigin = "BANCO" | "COFRE";

/**
 * `OVERDUE` nunca é persistido pelo aplicativo — é sempre computado na
 * leitura (dueDate no passado + status ainda PENDING). No banco, o
 * campo `status` só transita PENDING -> PAID ou PENDING -> CANCELLED.
 */
export interface AccountsPayable {
  id: string;
  organizationId: string;
  publicToken: string;

  supplierId: string;
  categoryId: string;

  description: string;
  amount: Prisma.Decimal;
  dueDate: Date;

  barcode: string | null;
  digitableLine: string | null;
  pixKey: string | null;
  qrCodeUrl: string | null;
  boletoPdfUrl: string | null;

  status: PayableStatus;
  paymentOrigin: PaymentOrigin;

  recurringBillId: string | null;
  /** Posição desta conta na série da recorrência (1, 2, 3...) — null se não for recorrente. */
  occurrenceNumber: number | null;

  createdByUserId: string;
  createdByUserName: string;
  paidByUserId: string | null;
  paidByUserName: string | null;
  paidAt: Date | null;
  paidVia: PaymentConfirmationSource | null;
  /** Denormalizado só pra exibição (Drawer "Nº movimentação") — via join na infraestrutura. `null` até a conta ser paga via Cofre. */
  paidSafeMovementId: string | null;
  /** Denormalizado só pra exibição (coluna "Documentos" da listagem) — via `_count` na infraestrutura. Não inclui o boleto legado (`boletoPdfUrl`), que não é um `AccountsPayableAttachment`. */
  attachmentsCount: number;

  /** Interruptor por conta do lembrete de WhatsApp — `false` remove a conta do cron, independente de `reminderDaysBefore`. */
  reminderEnabled: boolean;
  /** Dias antes do vencimento em que o lembrete de WhatsApp começa a ser enviado (cron diário). */
  reminderDaysBefore: number;
  /** Evita reenviar o lembrete mais de uma vez no mesmo dia. `null` se nunca foi enviado. */
  lastReminderSentAt: Date | null;
  /** Id da mensagem (Z-API) do cartão-resumo com o botão "Pago" do último lembrete — só auditoria/depuração, a confirmação de pagamento casa pelo id da conta embutido no próprio botão clicado (ver `handle-zapi-webhook.use-case.ts`), não por este campo. `null` se nunca foi enviado ou a Z-API não devolveu id. */
  lastReminderMessageId: string | null;

  /** Soft delete — não persistido fisicamente. `null` enquanto a conta não foi excluída. */
  deletedAt: Date | null;
  deletedByUserId: string | null;
  deletedByUserName: string | null;
  deletionReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}
