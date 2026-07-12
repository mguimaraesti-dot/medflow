import { z } from "zod";

export const getStatusReportCofreSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetStatusReportCofreInput = z.infer<
  typeof getStatusReportCofreSchema
>;
