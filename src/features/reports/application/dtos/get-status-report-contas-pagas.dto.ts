import { z } from "zod";

export const getStatusReportContasPagasSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetStatusReportContasPagasInput = z.infer<
  typeof getStatusReportContasPagasSchema
>;
