import { z } from "zod";

export const getExpensesByCategorySchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetExpensesByCategoryQuery = z.infer<
  typeof getExpensesByCategorySchema
>;
