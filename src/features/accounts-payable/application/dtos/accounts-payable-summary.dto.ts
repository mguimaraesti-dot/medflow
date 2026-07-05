import { z } from "zod";

export const getAccountsPayableSummarySchema = z.object({
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
});

export type GetAccountsPayableSummaryInput = z.infer<
  typeof getAccountsPayableSummarySchema
>;
