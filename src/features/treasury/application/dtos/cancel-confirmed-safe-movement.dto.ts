import { z } from "zod";

export const cancelConfirmedSafeMovementSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "A justificativa precisa ter pelo menos 10 caracteres"),
});

export type CancelConfirmedSafeMovementInput = z.infer<
  typeof cancelConfirmedSafeMovementSchema
>;
