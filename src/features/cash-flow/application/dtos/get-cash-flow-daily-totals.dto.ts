import { z } from "zod";

export const getCashFlowDailyTotalsSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetCashFlowDailyTotalsQuery = z.infer<
  typeof getCashFlowDailyTotalsSchema
>;
