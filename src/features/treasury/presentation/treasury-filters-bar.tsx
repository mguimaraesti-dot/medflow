"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import type {
  SafeMovementType,
  SafeMovementStatus,
} from "../domain/safe-movement.entity";

export type QuickPeriod = "TODAY" | "YESTERDAY" | "7D" | "30D";

const PERIOD_OPTIONS: { value: QuickPeriod; label: string }[] = [
  { value: "TODAY", label: "Hoje" },
  { value: "YESTERDAY", label: "Ontem" },
  { value: "7D", label: "7 dias" },
  { value: "30D", label: "30 dias" },
];

/** Cada chip de Origem mapeia pra um subconjunto de `SafeMovementType` — clicar soma/remove esses tipos do filtro (união, nunca interseção). */
const ORIGIN_OPTIONS: { label: string; types: SafeMovementType[] }[] = [
  { label: "Recepção", types: ["SANGRIA", "CASH_REGISTER_HANDOFF"] },
  { label: "Contas a Pagar", types: ["ACCOUNTS_PAYABLE_PAYMENT"] },
  { label: "Ajustes", types: ["MANUAL_ADJUSTMENT"] },
];

const DIRECTION_OPTIONS: { label: string; types: SafeMovementType[] }[] = [
  { label: "Entradas", types: ["SANGRIA", "CASH_REGISTER_HANDOFF"] },
  { label: "Saídas", types: ["FUNDING", "ACCOUNTS_PAYABLE_PAYMENT"] },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function TreasuryFiltersBar({
  period,
  onPeriodChange,
  selectedTypes,
  onToggleTypes,
  status,
  onStatusChange,
  search,
  onSearchChange,
}: {
  period: QuickPeriod;
  onPeriodChange: (period: QuickPeriod) => void;
  selectedTypes: SafeMovementType[];
  onToggleTypes: (types: SafeMovementType[]) => void;
  status?: SafeMovementStatus;
  onStatusChange: (status?: SafeMovementStatus) => void;
  search: string;
  onSearchChange: (search: string) => void;
}) {
  function isGroupActive(types: SafeMovementType[]): boolean {
    return types.every((type) => selectedTypes.includes(type));
  }

  function toggleGroup(types: SafeMovementType[]) {
    onToggleTypes(types);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            active={period === option.value}
            onClick={() => onPeriodChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}

        <span className="bg-border mx-1 h-5 w-px" aria-hidden />

        {DIRECTION_OPTIONS.map((option) => (
          <Chip
            key={option.label}
            active={isGroupActive(option.types)}
            onClick={() => toggleGroup(option.types)}
          >
            {option.label}
          </Chip>
        ))}
        <Chip
          active={status === "PENDING"}
          onClick={() =>
            onStatusChange(status === "PENDING" ? undefined : "PENDING")
          }
        >
          Pendentes
        </Chip>
        <Chip
          active={status === "CONFIRMED"}
          onClick={() =>
            onStatusChange(status === "CONFIRMED" ? undefined : "CONFIRMED")
          }
        >
          Confirmadas
        </Chip>

        <span className="bg-border mx-1 h-5 w-px" aria-hidden />

        {ORIGIN_OPTIONS.map((option) => (
          <Chip
            key={option.label}
            active={isGroupActive(option.types)}
            onClick={() => toggleGroup(option.types)}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por descrição ou responsável..."
          className="pl-9"
        />
      </div>
    </div>
  );
}

export function computeQuickPeriodRange(period: QuickPeriod): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCHours(23, 59, 59, 999);

  if (period === "TODAY") return { from: todayStart, to: todayEnd };

  if (period === "YESTERDAY") {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setUTCHours(23, 59, 59, 999);
    return { from: yesterdayStart, to: yesterdayEnd };
  }

  const daysAgo = period === "7D" ? 6 : 29;
  const from = new Date(todayStart);
  from.setUTCDate(from.getUTCDate() - daysAgo);
  return { from, to: todayEnd };
}
