import { z } from "zod";

/**
 * `description` é opcional — se omitida, o use case gera automaticamente
 * "Estorno referente ao lançamento #..." (US06, critério de aceite).
 */
export const reverseCashFlowEntrySchema = z.object({
  description: z.string().trim().max(500).optional(),
});

export type ReverseCashFlowEntryInput = z.infer<
  typeof reverseCashFlowEntrySchema
>;
