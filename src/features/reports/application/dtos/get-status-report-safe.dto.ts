import { z } from "zod";

export const getStatusReportSafeSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetStatusReportSafeInput = z.infer<
  typeof getStatusReportSafeSchema
>;
