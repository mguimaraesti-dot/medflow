"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export function useSendStatusReportRecebimentosWhatsApp() {
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom: Date; dateTo: Date }) =>
      apiFetch<{ sent: boolean }>(
        "/api/reports/status-report-recebimentos/send-whatsapp",
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
