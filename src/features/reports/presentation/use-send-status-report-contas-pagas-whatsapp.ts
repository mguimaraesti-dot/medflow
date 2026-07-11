"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export function useSendStatusReportContasPagasWhatsApp() {
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom: Date; dateTo: Date }) =>
      apiFetch<{ sent: boolean }>(
        "/api/reports/status-report-contas-pagas/send-whatsapp",
        {
          method: "POST",
          body: JSON.stringify({
            dateFrom: dateFrom.toISOString(),
            dateTo: dateTo.toISOString(),
          }),
        },
      ),
  });
}
