import { z } from "zod";

export const getStatusReportSummarySchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetStatusReportSummaryInput = z.infer<
  typeof getStatusReportSummarySchema
>;
