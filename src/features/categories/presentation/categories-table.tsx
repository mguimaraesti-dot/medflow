"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/lib/utils";
import { colorName } from "./category-color-picker";
import type { CategoryResponseDTO } from "../application/dtos/category.response-dto";

type SortField = "NAME" | "TYPE" | "LINKED_COUNT";
type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function SortableHead({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortField;
  sort: { field: SortField; direction: SortDirection } | null;
  onSort: (field: SortField) => void;
}) {
  const active = sort?.field === field;
  return (
    <TableHead
      className="text-foreground hover:text-foreground/80 cursor-pointer font-medium transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

export function CategoriesTable({
  categories,
  canEdit,
  onEdit,
  onDeleteRequest,
}: {
  categories: CategoryResponseDTO[];
  canEdit: boolean;
  onEdit: (category: CategoryResponseDTO) => void;
  onDeleteRequest: (category: CategoryResponseDTO) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  } | null>(null);

  function toggleSort(field: SortField) {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return null;
    });
  }

  const sorted = useMemo(() => {
    if (!sort) return categories;
    const dir = sort.direction === "asc" ? 1 : -1;
    const items = [...categories];
    items.sort((a, b) => {
      switch (sort.field) {
        case "NAME":
          return a.name.localeCompare(b.name) * dir;
        case "TYPE":
          return a.type.localeCompare(b.type) * dir;
        case "LINKED_COUNT":
          return (a.linkedRecordsCount - b.linkedRecordsCount) * dir;
        default:
          return 0;
      }
    });
    return items;
  }, [categories, sort]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const firstItemIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItemIndex = Math.min(currentPage * pageSize, total);

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Cor</TableHead>
            <SortableHead
              label="Nome"
              field="NAME"
              sort={sort}
              onSort={toggleSort}
            />
            <SortableHead
              label="Tipo"
              field="TYPE"
              sort={sort}
              onSort={toggleSort}
            />
            <SortableHead
              label="Qtd. Contas"
              field="LINKED_COUNT"
              sort={sort}
              onSort={toggleSort}
            />
            {canEdit && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{colorName(category.color)}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    category.type === "IN"
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500"
                      : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
                  )}
                >
                  {category.type === "IN" ? "Entrada" : "Saída"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {category.linkedRecordsCount}
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Mais ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(category)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDeleteRequest(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          Mostrando {firstItemIndex}–{lastItemIndex} de {total}{" "}
          {total === 1 ? "categoria" : "categorias"}
        </p>
        <div className="flex items-center gap-3">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {"<"}
            </Button>
            <span className="text-muted-foreground px-2 text-sm tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {">"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
