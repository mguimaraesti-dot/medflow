import { z } from "zod";

export const reopenCashRegisterSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "A justificativa precisa ter pelo menos 10 caracteres"),
});

export type ReopenCashRegisterInput = z.infer<typeof reopenCashRegisterSchema>;
