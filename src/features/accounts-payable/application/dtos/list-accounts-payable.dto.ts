import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";
import { cuidSchema } from "@/shared/lib/validators";

export const listAccountsPayableSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  /** Filtra por data de pagamento (`paidAt`), não vencimento — usado pelo relatório "Contas Pagas" (Central de Relatórios). */
  paidAtFrom: z.coerce.date().optional(),
  paidAtTo: z.coerce.date().optional(),
  supplierId: cuidSchema.optional(),
  categoryId: cuidSchema.optional(),
  recurringBillId: cuidSchema.optional(),
  /** Filtro "Recorrência" da tela: todas / só recorrentes / só avulsas. */
  recurringOnly: z.enum(["RECURRING", "NON_RECURRING"]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  /** `true` só na tela "Contas Excluídas" — nunca combinado com o filtro padrão. */
  deletedOnly: z.coerce.boolean().optional(),
  /** "Dr. Flávio" (BANCO) ou "Cofre" — usado pelo Relatório de Contas a Pagar consolidado. */
  paymentOrigin: z.enum(["BANCO", "COFRE"]).optional(),
  /** Combinado com `status` omitido, pra listar Pagas+Pendentes+Vencidas juntas sem trazer Canceladas — usado pelo Relatório de Contas a Pagar consolidado. */
  excludeCancelled: z.coerce.boolean().optional(),
});

export type ListAccountsPayableInput = z.infer<
  typeof listAccountsPayableSchema
>;
