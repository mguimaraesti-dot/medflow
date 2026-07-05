import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";
import { cuidSchema } from "@/shared/lib/validators";

export const listAccountsPayableSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  supplierId: cuidSchema.optional(),
  categoryId: cuidSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export type ListAccountsPayableInput = z.infer<
  typeof listAccountsPayableSchema
>;
