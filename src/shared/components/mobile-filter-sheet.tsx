"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
 * `children` — cada tela monta os seus com `FilterAccordionGroup`
 * (grupo recolhível, mostra o valor selecionado no cabeçalho) envolvendo
 * um `FilterChipGroup` (grupos pequenos) ou `FilterSearchList` (listas
 * longas), em vez deste componente tentar adivinhar o formato de cada
 * filtro.
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
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

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
        {/* `pr-10` abre espaço pro X que o SheetContent já desenha no
            canto (absolute top-4 right-4) — sem isso "Limpar" ficava por
            baixo do X (os dois disputando o canto direito). */}
        <SheetHeader className="flex-row items-center justify-between gap-2 pr-10">
          <SheetTitle>Filtros</SheetTitle>
          <button
            type="button"
            className="text-primary text-sm font-medium"
            onClick={onClear}
          >
            Limpar
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <AccordionContext.Provider
            value={{ openKey: openGroupKey, setOpenKey: setOpenGroupKey }}
          >
            {children}
          </AccordionContext.Provider>
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

const AccordionContext = createContext<{
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
} | null>(null);

/**
 * Grupo recolhível de um filtro — mostra o rótulo + valor atual (ex:
 * "Este Mês", "Medicamentos") no cabeçalho, sem precisar abrir pra saber
 * o que está selecionado. Só um grupo aberto por vez (estado vive no
 * `MobileFilterSheet` pai via Context, então a tela que usa isso não
 * precisa gerenciar "qual grupo está aberto" sozinha).
 */
export function FilterAccordionGroup({
  groupKey,
  label,
  summary,
  isActive,
  children,
}: {
  /** Único dentro do mesmo `MobileFilterSheet` — identifica o grupo pro "só um aberto por vez". */
  groupKey: string;
  label: string;
  /** Texto do valor atual (ex: "Todos", "Este Mês", "Medicamentos"). */
  summary: string;
  /** Destaca `summary` (cor de destaque) quando o filtro não está no valor padrão. */
  isActive?: boolean;
  children: ReactNode;
}) {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error(
      "FilterAccordionGroup precisa ser usado dentro de um MobileFilterSheet",
    );
  }
  const isOpen = ctx.openKey === groupKey;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3.5"
        onClick={() => ctx.setOpenKey(isOpen ? null : groupKey)}
      >
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {label}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm",
              isActive ? "text-primary font-medium" : "text-foreground",
            )}
          >
            {summary}
          </span>
          <ChevronDown
            className={cn(
              "text-muted-foreground h-3.5 w-3.5 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/** Grupo de chips tocáveis pra um filtro de seleção única — usado dentro de um `FilterAccordionGroup` (Status, Recorrência) ou standalone (Período). */
export function FilterChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  allLabel = "Todos",
}: {
  /** Omitido quando já usado dentro de um `FilterAccordionGroup` (o rótulo já aparece no cabeçalho do grupo). */
  label?: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  allLabel?: string;
}) {
  return (
    <div>
      {label && (
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
      )}
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

/**
 * Lista buscável e rolável pra um filtro de seleção única com muitas
 * opções (Categorias, Beneficiários) — chips não escalam nesses casos
 * (viravam meia tela de botões). Usada dentro de um `FilterAccordionGroup`.
 */
export function FilterSearchList<T extends string>({
  options,
  value,
  onChange,
  searchPlaceholder,
  allLabel = "Todos",
  itemNamePlural,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  searchPlaceholder: string;
  allLabel?: string;
  /** Usado no texto de rodapé da lista (ex: "12 categorias", "3 de 12 categorias"). */
  itemNamePlural: string;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? options.filter((option) => option.label.toLowerCase().includes(trimmed))
    : options;

  return (
    <div>
      <div className="relative mb-2">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={searchPlaceholder}
          className="h-9 pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="max-h-[180px] space-y-0.5 overflow-y-auto">
        <FilterSearchRow
          selected={value === undefined}
          onClick={() => onChange(undefined)}
        >
          {allLabel}
        </FilterSearchRow>
        {filtered.map((option) => (
          <FilterSearchRow
            key={option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </FilterSearchRow>
        ))}
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {trimmed
          ? `${filtered.length} de ${options.length} ${itemNamePlural}`
          : `${options.length} ${itemNamePlural}`}
      </p>
    </div>
  );
}

function FilterSearchRow({
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
        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted/60 text-foreground",
      )}
    >
      {children}
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}
