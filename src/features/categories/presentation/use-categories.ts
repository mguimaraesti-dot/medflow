"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { Category, CategoryType } from "../domain/category.entity";

export function useCategories(type?: CategoryType) {
  return useQuery({
    queryKey: ["categories", type ?? "all"],
    queryFn: () =>
      apiFetch<Category[]>(
        type ? `/api/categories?type=${type}` : "/api/categories",
      ),
  });
}
