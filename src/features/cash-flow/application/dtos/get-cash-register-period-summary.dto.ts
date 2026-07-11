import { z } from "zod";

export const getCashRegisterPeriodSummarySchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetCashRegisterPeriodSummaryInput = z.infer<
  typeof getCashRegisterPeriodSummarySchema
>;
