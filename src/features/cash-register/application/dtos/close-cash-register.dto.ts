import { z } from "zod";
import { shortTextSchema } from "@/shared/lib/validators";

/**
 * Fechar o caixa é imediato (`CLOSED`, sem estado intermediário) — a
 * secretária presta contas do dinheiro contado; `expectedCashAmount`/
 * `difference` são sempre calculados no backend, nunca aceitos do
 * cliente.
 */
export const closeCashRegisterSchema = z.object({
  countedAmount: z
    .number()
    .nonnegative("Valor contado não pode ser negativo")
    .multipleOf(0.01, "Use no máximo 2 casas decimais"),
  closureNote: shortTextSchema(),
});

export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
