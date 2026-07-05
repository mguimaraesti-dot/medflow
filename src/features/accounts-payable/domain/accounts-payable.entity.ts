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

  createdByUserId: string;
  paidByUserId: string | null;
  paidAt: Date | null;
  paidVia: PaymentConfirmationSource | null;

  createdAt: Date;
  updatedAt: Date;
}
