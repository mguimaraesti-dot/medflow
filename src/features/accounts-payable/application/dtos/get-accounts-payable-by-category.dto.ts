import { z } from "zod";

export const getAccountsPayableByCategorySchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetAccountsPayableByCategoryQuery = z.infer<
  typeof getAccountsPayableByCategorySchema
>;
