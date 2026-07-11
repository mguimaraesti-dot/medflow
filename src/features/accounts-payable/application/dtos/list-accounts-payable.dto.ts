import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";
import { cuidSchema } from "@/shared/lib/validators";

export const listAccountsPayableSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  supplierId: cuidSchema.optional(),
  categoryId: cuidSchema.optional(),
  recurringBillId: cuidSchema.optional(),
  /** Filtro "Recorrência" da tela: todas / só recorrentes / só avulsas. */
  recurringOnly: z.enum(["RECURRING", "NON_RECURRING"]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  /** `true` só na tela "Contas Excluídas" — nunca combinado com o filtro padrão. */
  deletedOnly: z.coerce.boolean().optional(),
});

export type ListAccountsPayableInput = z.infer<
  typeof listAccountsPayableSchema
>;
