"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import type { CategoryResponseDTO } from "../application/dtos/category.response-dto";

/**
 * Lista mobile de Categorias — linha compacta (bolinha de cor + nome
 * truncado + badge de tipo), substitui a `CategoriesTable` (que é uma
 * tabela HTML de verdade, sem tratamento de overflow) abaixo do
 * breakpoint mobile. "⋯" reaproveita exatamente o Editar/Excluir que já
 * existe na tabela desktop — nenhuma ação nova.
 */
export function CategoriesCards({
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
  return (
    <div className="divide-y">
      {categories.map((category) => (
        <div key={category.id} className="flex items-center gap-3 py-3">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
            {category.name}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              category.type === "IN"
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
            )}
          >
            {category.type === "IN" ? "Entrada" : "Saída"}
          </Badge>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                >
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
          )}
        </div>
      ))}
    </div>
  );
}
