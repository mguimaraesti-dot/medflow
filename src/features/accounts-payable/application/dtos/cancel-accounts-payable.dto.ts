import { z } from "zod";

/**
 * "SINGLE" (padrão) cancela só esta ocorrência. "SERIES" só faz sentido
 * quando a conta pertence a uma recorrência — encerra a série (desativa o
 * RecurringBill e cancela as demais ocorrências ainda PENDENTES); ignorado
 * silenciosamente em contas avulsas.
 */
export const cancelAccountsPayableSchema = z.object({
  scope: z.enum(["SINGLE", "SERIES"]).default("SINGLE"),
});

export type CancelAccountsPayableInput = z.infer<
  typeof cancelAccountsPayableSchema
>;
