import { z } from "zod";
import { cuidSchema, moneyAmountSchema } from "@/shared/lib/validators";

export const createCashFlowEntrySchema = z.object({
  type: z.enum(["IN", "OUT"]),
  amount: moneyAmountSchema,
  categoryId: cuidSchema,
  paymentMethodId: cuidSchema,
  description: z.string().trim().max(500).optional(),
  // Se omitido, o use case usa o horário atual do servidor.
  occurredAt: z.coerce.date().optional(),
});

export type CreateCashFlowEntryInput = z.infer<
  typeof createCashFlowEntrySchema
>;
