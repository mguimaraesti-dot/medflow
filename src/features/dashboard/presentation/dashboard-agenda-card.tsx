"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  useDashboardAgendaDueToday,
  useDashboardAgendaOverdue,
  type DashboardAgendaItemDTO,
} from "./use-dashboard-agenda";

function AgendaList({
  items,
  isLoading,
  supplierNameById,
}: {
  items: DashboardAgendaItemDTO[];
  isLoading: boolean;
  supplierNameById: Map<string, string>;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-sm">Nenhuma conta aqui.</p>
    );
  }

  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="flex flex-col">
      <div className="flex flex-1 flex-col divide-y">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {supplierNameById.get(item.supplierId) ?? item.description}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatDateOnlyBR(item.dueDate)}
              </p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatCurrencyBRL(item.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t pt-2">
        <span className="text-muted-foreground text-xs font-semibold">
          Total
        </span>
        <span className="text-base font-bold tabular-nums">
          {formatCurrencyBRL(total)}
        </span>
      </div>
    </div>
  );
}

export function DashboardAgendaCard({
  dueTodayCount,
  overdueCount,
}: {
  dueTodayCount: number;
  overdueCount: number;
}) {
  const [tab, setTab] = useState("due-today");
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

  return (
    <Card className="flex flex-col gap-4 py-4">
      <CardHeader className="flex-row items-center justify-between px-4">
        <CardTitle className="text-sm font-semibold">
          Agenda Financeira
        </CardTitle>
        <Link
          href="/accounts-payable"
          className="text-primary text-xs font-semibold hover:underline"
        >
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-4">
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex flex-1 flex-col"
        >
          <TabsList className="w-full">
            <TabsTrigger value="due-today" className="flex-1">
              Vencem Hoje ({dueTodayCount})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex-1">
              Vencidas ({overdueCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="due-today" className="flex-1">
            <AgendaList
              items={dueToday?.items ?? []}
              isLoading={isLoadingDueToday}
              supplierNameById={supplierNameById}
            />
          </TabsContent>
          <TabsContent value="overdue" className="flex-1">
            <AgendaList
              items={overdue?.items ?? []}
              isLoading={isLoadingOverdue}
              supplierNameById={supplierNameById}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
