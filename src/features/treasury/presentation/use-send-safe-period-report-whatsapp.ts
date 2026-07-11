"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export function useSendSafePeriodReportWhatsApp() {
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom: Date; dateTo: Date }) =>
      apiFetch<{ sent: boolean }>(
        "/api/treasury/safe/period-summary/send-whatsapp",
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
