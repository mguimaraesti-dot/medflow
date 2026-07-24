"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import {
  useDashboardAgendaDueToday,
  useDashboardAgendaOverdue,
  type DashboardAgendaItemDTO,
} from "./use-dashboard-agenda";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

/** Total de linhas exibidas somando os dois grupos — mesmo teto de uma consulta (`AGENDA_PAGE_SIZE`). Vencida é mais urgente, então ela nunca é cortada; "vencem hoje" cede espaço primeiro. */
const MAX_LIST_ROWS = 8;

function PayableRow({
  item,
  supplierName,
  tone,
}: {
  item: DashboardAgendaItemDTO;
  supplierName: string;
  tone: "destructive" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{supplierName}</p>
        <p className="text-muted-foreground text-xs">
          {formatDateOnlyBR(item.dueDate)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          tone === "destructive"
            ? "text-destructive"
            : "text-amber-600 dark:text-amber-500",
        )}
      >
        {formatCurrencyBRL(item.amount)}
      </span>
    </div>
  );
}

/**
 * "Contas a pagar" — seção 5 do Dashboard mobile. Vencidas + Vencem
 * Hoje lado a lado (mesmos `overdueAmount/Count`/`dueTodayAmount/Count`
 * do overview, já usados no KPI row) + a lista, agora agrupada em
 * "Vencidas" e "Vencem hoje" (mesmos hooks já usados pelo desktop em
 * `dashboard-agenda-card.tsx`). "Amanhã" fica de fora de propósito
 * (decisão do usuário — cálculo novo, PR próprio).
 */
export function DashboardMobilePayables({
  dueTodayAmount,
  dueTodayCount,
  overdueAmount,
  overdueCount,
}: {
  dueTodayAmount: string;
  dueTodayCount: number;
  overdueAmount: string;
  overdueCount: number;
}) {
  const { data: dueToday, isLoading: isLoadingDueToday } =
    useDashboardAgendaDueToday();
  const { data: overdue, isLoading: isLoadingOverdue } =
    useDashboardAgendaOverdue();
  const { data: suppliers } = useSuppliers();

  const supplierNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const supplier of suppliers ?? []) map.set(supplier.id, supplier.name);
    return map;
  }, [suppliers]);

  const isLoading = isLoadingDueToday || isLoadingOverdue;
  const overdueItems = overdue?.items ?? [];
  // Vencida nunca é cortada — "vencem hoje" cede espaço se a soma passar do teto.
  const dueTodayItems = (dueToday?.items ?? []).slice(
    0,
    Math.max(0, MAX_LIST_ROWS - overdueItems.length),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Contas a pagar
        </p>
        <Link
          href="/accounts-payable"
          className="text-primary text-xs font-semibold"
        >
          Ver todas
        </Link>
      </div>
      <Card className="py-3">
        <CardContent className="space-y-3 px-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-2.5">
              <p className="text-muted-foreground text-[11px]">VENCIDAS</p>
              <p className="text-destructive text-lg font-bold tabular-nums">
                {formatCurrencyBRL(overdueAmount)}
              </p>
              <p className="text-muted-foreground text-[10px]">
                {overdueCount === 0
                  ? "nenhuma"
                  : overdueCount === 1
                    ? "1 conta"
                    : `${overdueCount} contas`}
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
              <p className="text-muted-foreground text-[11px]">VENCEM HOJE</p>
              <p className="text-lg font-bold text-amber-600 tabular-nums dark:text-amber-500">
                {formatCurrencyBRL(dueTodayAmount)}
              </p>
              <p className="text-muted-foreground text-[10px]">
                {dueTodayCount === 0
                  ? "nenhuma"
                  : dueTodayCount === 1
                    ? "1 conta"
                    : `${dueTodayCount} contas`}
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}

          {!isLoading && overdueItems.length > 0 && (
            <div>
              <p className="text-destructive mb-1 text-[11px] font-semibold tracking-wide uppercase">
                Vencidas · {overdueItems.length}
              </p>
              <div className="divide-y">
                {overdueItems.map((item) => (
                  <PayableRow
                    key={item.id}
                    item={item}
                    supplierName={
                      supplierNameById.get(item.supplierId) ?? item.description
                    }
                    tone="destructive"
                  />
                ))}
              </div>
            </div>
          )}

          {!isLoading && dueTodayItems.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
                Vencem hoje · {dueTodayItems.length}
              </p>
              <div className="divide-y">
                {dueTodayItems.map((item) => (
                  <PayableRow
                    key={item.id}
                    item={item}
                    supplierName={
                      supplierNameById.get(item.supplierId) ?? item.description
                    }
                    tone="warning"
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
