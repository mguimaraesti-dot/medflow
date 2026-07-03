import { z } from "zod";

/**
 * Fechar o caixa não recebe nenhum dado do cliente — totalIn, totalOut e
 * closingBalance são sempre calculados no backend a partir dos
 * lançamentos reais (nunca confiar em valor enviado pelo cliente).
 */
export const closeCashRegisterSchema = z.object({});

export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
