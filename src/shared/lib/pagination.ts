import { z } from "zod";

/**
 * Schema de paginação padrão. DTOs de listagem de qualquer feature
 * estendem este schema em vez de redeclarar page/pageSize (Coding
 * Standards, item 15 — "toda listagem é paginada").
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: Pagination,
): PaginatedResult<T> {
  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}
