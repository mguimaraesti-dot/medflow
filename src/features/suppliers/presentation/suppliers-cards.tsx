"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatSupplierDocumentLabel } from "./supplier-helpers";
import type { SupplierResponseDTO } from "../application/dtos/supplier.response-dto";

/**
 * Lista mobile de Beneficiários — linha densa (nome + documento, SEM
 * avatar de iniciais, decisão do usuário). O nome usa truncamento
 * controlado (`truncate`) em vez de vazar a borda como antes; o nome
 * completo aparece ao abrir o beneficiário (`onSelect`).
 */
export function SuppliersCards({
  suppliers,
  onSelect,
}: {
  suppliers: SupplierResponseDTO[];
  onSelect?: (supplier: SupplierResponseDTO) => void;
}) {
  return (
    <div className="divide-y">
      {suppliers.map((supplier) => (
        <div
          key={supplier.id}
          className={cn(
            "flex items-center gap-3 py-3",
            onSelect && "cursor-pointer",
            !supplier.active && "opacity-60",
          )}
          onClick={onSelect ? () => onSelect(supplier) : undefined}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{supplier.name}</p>
            <p className="text-muted-foreground text-xs">
              {formatSupplierDocumentLabel(supplier)}
            </p>
          </div>
          {onSelect && (
            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
