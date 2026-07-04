import { z } from "zod";

/**
 * Motor de Tesouraria (ADR 2.8): o saldo inicial passa a ser sempre uma
 * retirada explícita do Cofre — não existe mais herança automática do
 * `closingBalance` do dia anterior, então `openingBalance` é sempre
 * obrigatório (não só no "primeiro uso", como antes).
 */
export const openCashRegisterSchema = z.object({
  openingBalance: z
    .number()
    .nonnegative("Saldo inicial não pode ser negativo")
    .multipleOf(0.01, "Use no máximo 2 casas decimais"),
});

export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
