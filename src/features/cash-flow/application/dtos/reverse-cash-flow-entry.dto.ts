import { z } from "zod";

/**
 * `description` (rótulo na UI: "Justificativa") passou a ser obrigatória
 * (Refinamento UX Caixa Recepção, item 13) — mantém o nome de campo
 * original (coluna já existente) pra não propagar rename em cascata pela
 * API/use case/repositório.
 */
export const reverseCashFlowEntrySchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "A justificativa precisa ter pelo menos 10 caracteres"),
});

export type ReverseCashFlowEntryInput = z.infer<
  typeof reverseCashFlowEntrySchema
>;
