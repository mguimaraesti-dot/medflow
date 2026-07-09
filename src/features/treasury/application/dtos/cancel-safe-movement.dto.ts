import { z } from "zod";

/** Mesmo padrão de `manual-adjustment.dto.ts` — justificativa obrigatória pra qualquer rejeição de pendência. */
export const cancelSafeMovementSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "A justificativa precisa ter pelo menos 10 caracteres"),
});

export type CancelSafeMovementInput = z.infer<typeof cancelSafeMovementSchema>;
