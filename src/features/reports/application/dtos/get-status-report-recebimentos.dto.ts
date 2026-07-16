import { z } from "zod";

export const getStatusReportRecebimentosSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type GetStatusReportRecebimentosInput = z.infer<
  typeof getStatusReportRecebimentosSchema
>;
