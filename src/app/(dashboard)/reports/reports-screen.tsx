"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  REPORT_CATALOG,
  findReportLabel,
  type ReportId,
} from "./report-catalog";
import { FinancialAvailabilityReport } from "./financial-availability-report";
import { CashRegisterHistoryTable } from "@/features/cash-register/presentation/cash-register-history-table";
import { CashRegisterDayDetailDrawer } from "@/features/cash-register/presentation/cash-register-day-detail-drawer";
import { CashRegisterDifferencesReportTable } from "@/features/cash-register/presentation/cash-register-differences-report-table";
import { CashFlowEntriesReportTable } from "@/features/cash-flow/presentation/cash-flow-entries-report-table";
import { CashFlowDailyTotalsReport } from "@/features/cash-flow/presentation/cash-flow-daily-totals-report";
import { SafeMovementsReportTable } from "@/features/treasury/presentation/safe-movements-report-table";
import { AccountsPayableReportTable } from "@/features/accounts-payable/presentation/accounts-payable-report-table";
import { AccountsPayableByCategoryReport } from "@/features/accounts-payable/presentation/accounts-payable-by-category-report";
import {
  PeriodSelector,
  computePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import type { CashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";

/**
 * Central de Relatórios — catálogo de 13 relatórios em 4 categorias
 * (Financeiro/Caixa/Tesouraria/Contas a Pagar). Rota de composição, não
 * uma feature própria (mesma decisão arquitetural de antes): cada
 * relatório reaproveita hooks/use-cases já existentes nas respectivas
 * features, só a tabela de apresentação é nova.
 */
export function ReportsScreen() {
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedReportId, setSelectedReportId] =
    useState<ReportId>("cash-closing");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [viewingDay, setViewingDay] =
    useState<CashRegisterDayResponseDTO | null>(null);

  const range = computePeriodRange(periodPreset, periodCustom);
  const title = findReportLabel(selectedReportId);

  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) return REPORT_CATALOG;
    return REPORT_CATALOG.map((category) => ({
      ...category,
      items: category.items.filter((item) =>
        item.label.toLowerCase().includes(query),
      ),
    })).filter((category) => category.items.length > 0);
  }, [catalogSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Central de Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Consulte e exporte os principais relatórios financeiros da clínica.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-[280px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Pesquisar relatórios..."
            className="h-10 rounded-xl pl-9"
            value={catalogSearch}
            onChange={(event) => setCatalogSearch(event.target.value)}
          />
        </div>
        <PeriodSelector
          preset={periodPreset}
          custom={periodCustom}
          onChange={(preset, custom) => {
            setPeriodPreset(preset);
            setPeriodCustom(custom);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filteredCatalog.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.id} className="rounded-2xl shadow-sm">
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className="text-primary h-4 w-4" />
                  {category.label}
                </div>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedReportId(item.id)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        selectedReportId === item.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        {selectedReportId === "cash-closing" && (
          <CashRegisterHistoryTable
            title={title}
            dateFrom={range.from}
            dateTo={range.to}
            onView={setViewingDay}
          />
        )}
        {selectedReportId === "cash-differences" && (
          <CashRegisterDifferencesReportTable
            title={title}
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {(selectedReportId === "cash-flow" ||
          selectedReportId === "cash-movements") && (
          <CashFlowEntriesReportTable
            title={title}
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "revenue-vs-expense" && (
          <CashFlowDailyTotalsReport
            title={title}
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "availability" && (
          <FinancialAvailabilityReport title={title} />
        )}
        {selectedReportId === "safe-receipts" && (
          <SafeMovementsReportTable
            title={title}
            types={["SANGRIA", "CASH_REGISTER_HANDOFF"]}
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "safe-adjustments" && (
          <SafeMovementsReportTable
            title={title}
            types={["MANUAL_ADJUSTMENT"]}
            directionFilter="ADJUSTMENT"
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "safe-withdrawals" && (
          <SafeMovementsReportTable
            title={title}
            types={["FUNDING", "MANUAL_ADJUSTMENT"]}
            directionFilter="OUT"
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "safe-balance" && (
          <SafeMovementsReportTable
            title={title}
            dateFrom={range.from}
            dateTo={range.to}
            showBalance
          />
        )}
        {selectedReportId === "payable-paid" && (
          <AccountsPayableReportTable
            title={title}
            status="PAID"
            dateField="paid"
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "payable-upcoming" && (
          <AccountsPayableReportTable
            title={title}
            status="PENDING"
            dateField="due"
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "payable-overdue" && (
          <AccountsPayableReportTable
            title={title}
            status="OVERDUE"
            dateField="due"
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
        {selectedReportId === "payable-by-category" && (
          <AccountsPayableByCategoryReport
            title={title}
            dateFrom={range.from}
            dateTo={range.to}
          />
        )}
      </div>

      <CashRegisterDayDetailDrawer
        day={viewingDay}
        open={viewingDay !== null}
        onOpenChange={(open) => !open && setViewingDay(null)}
      />
    </div>
  );
}
