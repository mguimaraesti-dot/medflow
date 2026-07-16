"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

/**
 * Painel de filtros mobile (bottom sheet) — peça compartilhada, pensada
 * pra ser reaproveitada por outras telas com tabela (Tesouraria, Caixa
 * Recepção) em PRs futuros. Recebe os grupos de filtro prontos via
 * `children` (cada tela monta os seus com `FilterChipGroup` abaixo, ou
 * qualquer outro controle — ex: `PeriodSelector` variant="segmented")
 * em vez deste componente tentar adivinhar o formato de cada filtro.
 */
export function MobileFilterSheet({
  activeCount,
  onClear,
  children,
  triggerLabel = "Filtros",
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={activeCount > 0 ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {triggerLabel}
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary-foreground/20 text-primary-foreground h-4 min-w-4 px-1"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col rounded-t-2xl"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2">
          <SheetTitle>Filtros</SheetTitle>
          <button
            type="button"
            className="text-primary text-sm font-medium"
            onClick={onClear}
          >
            Limpar
          </button>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-2">
          {children}
        </div>
        <SheetFooter>
          <Button
            type="button"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Aplicar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Grupo de chips tocáveis pra um filtro de seleção única — Status, Categoria, Recorrência, Beneficiário. */
export function FilterChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  allLabel = "Todos",
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  allLabel?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        <FilterChip
          selected={value === undefined}
          onClick={() => onChange(undefined)}
        >
          {allLabel}
        </FilterChip>
        {options.map((option) => (
          <FilterChip
            key={option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground font-medium"
          : "border-border bg-muted/40 text-foreground",
      )}
    >
      {children}
    </button>
  );
}
