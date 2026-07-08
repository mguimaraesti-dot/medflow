import type { Prisma } from "@prisma/client";

export type PayableStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

/** Hoje só "SYSTEM" é possível — WhatsApp ainda não integrado (só preparado via `publicToken`). */
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

  /** Soft delete — não persistido fisicamente. `null` enquanto a conta não foi excluída. */
  deletedAt: Date | null;
  deletedByUserId: string | null;
  deletedByUserName: string | null;
  deletionReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}
