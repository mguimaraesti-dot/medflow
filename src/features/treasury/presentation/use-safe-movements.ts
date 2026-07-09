"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";
import type {
  SafeMovementType,
  SafeMovementStatus,
} from "../domain/safe-movement.entity";

export interface SafeMovementsFilter {
  types?: SafeMovementType[];
  status?: SafeMovementStatus;
  search?: string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  page?: number;
  pageSize?: number;
}

export function useSafeMovements(filter: SafeMovementsFilter) {
  const params = new URLSearchParams();
  if (filter.types && filter.types.length > 0)
    params.set("types", filter.types.join(","));
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  if (filter.createdAtFrom)
    params.set("createdAtFrom", filter.createdAtFrom.toISOString());
  if (filter.createdAtTo)
    params.set("createdAtTo", filter.createdAtTo.toISOString());
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  return useQuery({
    queryKey: ["treasury", "movements", filter],
    queryFn: () =>
      apiFetch<PaginatedResult<SafeMovementResponseDTO>>(
        `/api/treasury/movements?${params.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}
