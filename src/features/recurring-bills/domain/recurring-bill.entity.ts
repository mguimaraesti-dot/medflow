import type { Prisma } from "@prisma/client";

export interface RecurringBill {
  id: string;
  organizationId: string;
  supplierId: string;
  categoryId: string;
  description: string;
  amount: Prisma.Decimal;
  dueDay: number;
  active: boolean;
}
