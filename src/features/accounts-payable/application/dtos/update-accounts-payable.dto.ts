import { z } from "zod";
import { cuidSchema, dateOnlySchema } from "@/shared/lib/validators";

/**
 * Nunca inclui `amount` — valor continua imutável fora do cadastro inicial.
 * `scope` só importa quando a conta pertence a uma recorrência: "SINGLE"
 * altera só esta ocorrência, "SERIES" propaga fornecedor/categoria/
 * observação pras próximas ocorrências PENDENTES (o vencimento de cada uma
 * continua o seu, nunca é sobrescrito em lote).
 */
export const updateAccountsPayableSchema = z.object({
  supplierId: cuidSchema,
  categoryId: cuidSchema,
  description: z.string().trim().min(1, "Informe a descrição").max(200),
  dueDate: dateOnlySchema,
  scope: z.enum(["SINGLE", "SERIES"]).default("SINGLE"),
});

export type UpdateAccountsPayableInput = z.infer<
  typeof updateAccountsPayableSchema
>;
