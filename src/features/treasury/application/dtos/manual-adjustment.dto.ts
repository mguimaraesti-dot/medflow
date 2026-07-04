import { z } from "zod";

/**
 * Único `SafeMovement` sem direção implícita pelo `type` (decisão
 * confirmada: `amount` com sinal em vez de um campo `direction` novo,
 * que o ADR evitou introduzir para os outros tipos). `reason` é
 * obrigatório aqui — nos demais tipos não é.
 */
export const manualAdjustmentSchema = z.object({
  amount: z
    .number()
    .refine((value) => value !== 0, "O valor não pode ser zero")
    .multipleOf(0.01, "Use no máximo 2 casas decimais"),
  reason: z
    .string()
    .trim()
    .min(10, "A justificativa precisa ter pelo menos 10 caracteres"),
});

export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;
