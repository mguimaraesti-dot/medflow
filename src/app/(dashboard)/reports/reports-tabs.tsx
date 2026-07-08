"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CashRegisterHistoryTable } from "@/features/cash-register/presentation/cash-register-history-table";
import { CashRegisterDayDetailDrawer } from "@/features/cash-register/presentation/cash-register-day-detail-drawer";
import {
  PeriodSelector,
  computePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { CashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";

// recharts só entra no bundle quando a aba "Despesas por Categoria" é
// aberta — evita carregar a biblioteca no bundle inicial de /reports.
const ExpensesByCategoryReport = dynamic(
  () =>
    import("@/features/cash-flow/presentation/expenses-by-category-report").then(
      (mod) => mod.ExpensesByCategoryReport,
    ),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

/**
 * Composição de duas features (`cash-register` + `cash-flow`) em uma
 * única tela — "Relatórios" não tem entidade própria, então não vira
 * uma feature nova; quem compõe é a rota, não uma feature importando a
 * outra (ver Contexto do plano da Sprint 3).
 */
export function ReportsTabs() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [viewingDay, setViewingDay] =
    useState<CashRegisterDayResponseDTO | null>(null);

  const range = computePeriodRange(periodPreset, periodCustom);

  return (
    <Tabs defaultValue="closing">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <TabsList>
          <TabsTrigger value="closing">Fechamento Diário</TabsTrigger>
          <TabsTrigger value="expenses">Despesas por Categoria</TabsTrigger>
        </TabsList>
        <PeriodSelector
          preset={periodPreset}
          custom={periodCustom}
          onChange={(preset, custom) => {
            setPeriodPreset(preset);
            setPeriodCustom(custom);
          }}
        />
      </div>

      <TabsContent value="closing" className="mt-6">
        <Card>
          <CardContent className="pt-6">
            <CashRegisterHistoryTable
              dateFrom={range.from}
              dateTo={range.to}
              onView={setViewingDay}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="expenses" className="mt-6">
        <ExpensesByCategoryReport dateFrom={range.from} dateTo={range.to} />
      </TabsContent>

      <CashRegisterDayDetailDrawer
        day={viewingDay}
        open={viewingDay !== null}
        onOpenChange={(open) => !open && setViewingDay(null)}
      />
    </Tabs>
  );
}
