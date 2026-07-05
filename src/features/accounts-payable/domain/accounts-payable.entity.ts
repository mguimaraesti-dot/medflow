import type { Prisma } from "@prisma/client";

export type PayableStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

/** Hoje só "SYSTEM" é possível — WhatsApp ainda não integrado (só preparado via `publicToken`). */
export type PaymentConfirmationSource = "SYSTEM" | "WHATSAPP";

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

  recurringBillId: string | null;
  /** Posição desta conta na série da recorrência (1, 2, 3...) — null se não for recorrente. */
  occurrenceNumber: number | null;

  createdByUserId: string;
  createdByUserName: string;
  paidByUserId: string | null;
  paidByUserName: string | null;
  paidAt: Date | null;
  paidVia: PaymentConfirmationSource | null;

  /** Soft delete — não persistido fisicamente. `null` enquanto a conta não foi excluída. */
  deletedAt: Date | null;
  deletedByUserId: string | null;
  deletedByUserName: string | null;
  deletionReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}
