"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useDashboardAgendaDueToday } from "./use-dashboard-agenda";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

/**
 * "Contas a pagar" — seção 5 do Dashboard mobile. Vencidas + Vencem
 * Hoje lado a lado (mesmos `overdueAmount/Count`/`dueTodayAmount/Count`
 * do overview, já usados no KPI row) + a lista de quem vence hoje
 * (mesmo `useDashboardAgendaDueToday` já usado na aba "Vencem Hoje" da
 * Agenda Financeira desktop). "Amanhã" fica de fora de propósito
 * (decisão do usuário — cálculo novo, PR próprio). A lista de
 * VENCIDAS não é repetida aqui — "Ver todas" leva à tela completa.
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
  const { data: dueToday, isLoading } = useDashboardAgendaDueToday();
  const { data: suppliers } = useSuppliers();

  const supplierNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const supplier of suppliers ?? []) map.set(supplier.id, supplier.name);
    return map;
  }, [suppliers]);

  const items = dueToday?.items ?? [];

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

          {!isLoading && items.length > 0 && (
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {supplierNameById.get(item.supplierId) ??
                        item.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateOnlyBR(item.dueDate)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      "text-amber-600 dark:text-amber-500",
                    )}
                  >
                    {formatCurrencyBRL(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
