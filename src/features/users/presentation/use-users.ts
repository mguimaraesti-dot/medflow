"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { UserResponseDTO } from "../application/dtos/user.response-dto";

export interface UsersFilter {
  status?: "ACTIVE" | "INACTIVE" | "PENDING";
  roleId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useUsers(filter: UsersFilter) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.roleId) params.set("roleId", filter.roleId);
  if (filter.search) params.set("search", filter.search);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  return useQuery({
    queryKey: ["users", filter],
    queryFn: () =>
      apiFetch<PaginatedResult<UserResponseDTO>>(
        `/api/users?${params.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}
