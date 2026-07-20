"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { CategoryType } from "../domain/category.entity";

/**
 * Segmented de 2 botões pro campo Tipo — só usado no sheet de cadastro
 * mobile de Categorias (protótipo do usuário). O formulário desktop e o
 * `CategoryEditDialog` continuam com o `Select` original; como Tipo só
 * tem 2 opções, um dropdown ali é overkill, mas trocar os 3 lugares de
 * uma vez não foi pedido.
 */
export function CategoryTypeSegmented({
  value,
  onChange,
}: {
  value: CategoryType;
  onChange: (value: CategoryType) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Tipo">
      <button
        type="button"
        role="radio"
        aria-checked={value === "IN"}
        onClick={() => onChange("IN")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
          value === "IN"
            ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
            : "border-input bg-input-background text-muted-foreground",
        )}
      >
        <ArrowDown className="h-4 w-4" />
        Entrada
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "OUT"}
        onClick={() => onChange("OUT")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
          value === "OUT"
            ? "border-red-500 bg-red-500/15 text-red-700 dark:text-red-400"
            : "border-input bg-input-background text-muted-foreground",
        )}
      >
        <ArrowUp className="h-4 w-4" />
        Saída
      </button>
    </div>
  );
}
