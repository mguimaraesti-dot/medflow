import { z } from "zod";

export const getSafePeriodSummarySchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetSafePeriodSummaryInput = z.infer<
  typeof getSafePeriodSummarySchema
>;
