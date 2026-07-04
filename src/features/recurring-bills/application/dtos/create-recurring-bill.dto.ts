import { z } from "zod";
import { cuidSchema, moneyAmountSchema } from "@/shared/lib/validators";

export const createRecurringBillSchema = z.object({
  supplierId: cuidSchema,
  categoryId: cuidSchema,
  description: z.string().trim().min(1).max(200),
  amount: moneyAmountSchema,
  // Dia do mês (1-28) — evita problema em fevereiro, mesma regra do schema.
  dueDay: z.number().int().min(1).max(28),
});

export type CreateRecurringBillInput = z.infer<
  typeof createRecurringBillSchema
>;
