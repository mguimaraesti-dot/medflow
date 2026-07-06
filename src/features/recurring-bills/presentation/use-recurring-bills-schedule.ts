"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { RecurringBillsScheduleResponseDTO } from "../application/dtos/recurring-bills-schedule.response-dto";

export function useRecurringBillsSchedule(month: number, year: number) {
  return useQuery({
    queryKey: ["recurring-bills-schedule", month, year],
    queryFn: () =>
      apiFetch<RecurringBillsScheduleResponseDTO>(
        `/api/recurring-bills/schedule?month=${month}&year=${year}`,
      ),
  });
}
