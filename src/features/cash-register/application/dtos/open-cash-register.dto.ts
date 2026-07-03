import { z } from "zod";

/**
 * Saldo inicial só é obrigatório no primeiro uso do sistema (US02); nos
 * demais dias, o backend usa automaticamente o `closingBalance` do
 * último `CashRegisterDay` fechado — o use case decide isso, não o DTO.
 */
export const openCashRegisterSchema = z.object({
  openingBalance: z
    .number()
    .nonnegative("Saldo inicial não pode ser negativo")
    .multipleOf(0.01, "Use no máximo 2 casas decimais")
    .optional(),
});

export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
