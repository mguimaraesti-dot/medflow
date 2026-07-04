"use client";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

export type QuickDateFilter = "today" | "yesterday" | "week" | "month" | "all";

const OPTIONS: { value: QuickDateFilter; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todos" },
];

/** Datas sempre em UTC — mesma convenção de "dia de caixa" usada no resto do sistema. */
export function getDateRangeForQuickFilter(filter: QuickDateFilter): {
  dateFrom?: Date;
  dateTo?: Date;
} {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);

  switch (filter) {
    case "today":
      return { dateFrom: today, dateTo: endOfToday };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setUTCHours(23, 59, 59, 999);
      return { dateFrom: yesterday, dateTo: endOfYesterday };
    }
    case "week": {
      const weekStart = new Date(today);
      weekStart.setUTCDate(weekStart.getUTCDate() - 6);
      return { dateFrom: weekStart, dateTo: endOfToday };
    }
    case "month": {
      const monthStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
      );
      return { dateFrom: monthStart, dateTo: endOfToday };
    }
    case "all":
      return {};
  }
}

export function DateQuickFilters({
  value,
  onChange,
}: {
  value: QuickDateFilter;
  onChange: (filter: QuickDateFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={option.value === value ? "default" : "outline"}
          className={cn(option.value !== value && "text-muted-foreground")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
