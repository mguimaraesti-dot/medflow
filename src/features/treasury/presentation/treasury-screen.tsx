"use client";

import { useState } from "react";
import {
  Vault,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useSafeMovements } from "./use-safe-movements";
import { useTreasuryDashboardSummary } from "./use-treasury-dashboard-summary";
import { SafeMovementsTable } from "./safe-movements-table";
import { SangriaDialog } from "./sangria-dialog";
import { WithdrawalDialog } from "./withdrawal-dialog";
import { ManualAdjustmentDialog } from "./manual-adjustment-dialog";
import {
  TreasuryFiltersBar,
  computeQuickPeriodRange,
  type QuickPeriod,
} from "./treasury-filters-bar";
import { TreasuryPeriodSummary } from "./treasury-period-summary";
import { TreasuryTimeline } from "./treasury-timeline";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { KpiCard } from "@/shared/components/kpi-card";
import { Card, CardContent } from "@/shared/ui/card";
import type {
  SafeMovementType,
  SafeMovementStatus,
} from "../domain/safe-movement.entity";

/**
 * Tesouraria — dashboard de indicadores + tabela rica com Origem/
 * Categoria/Status/Ações, filtros rápidos e conferência gerencial do
 * fechamento de caixa (Refinamento UX/UI Tesouraria).
 */
export function TreasuryScreen({ permissions }: { permissions: string[] }) {
  const can = (permission: string) => permissions.includes(permission);
  const canReceive = can(PERMISSIONS.TREASURY_SANGRIA);
  const canManualAdjustment = can(PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT);
  const canConfirm = can(PERMISSIONS.TREASURY_CONFIRM_MOVEMENT);

  const [period, setPeriod] = useState<QuickPeriod>("30D");
  const [selectedTypes, setSelectedTypes] = useState<SafeMovementType[]>([]);
  const [status, setStatus] = useState<SafeMovementStatus | undefined>();
  const [search, setSearch] = useState("");

  const range = computeQuickPeriodRange(period);
  const filter = {
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
    status,
    search: search.trim() || undefined,
    createdAtFrom: range.from,
    createdAtTo: range.to,
  };

  const { data: dashboard } = useTreasuryDashboardSummary();
  const { data: totalsOnly } = useSafeMovements({
    ...filter,
    page: 1,
    pageSize: 1,
  });

  function toggleTypes(types: SafeMovementType[]) {
    const allActive = types.every((type) => selectedTypes.includes(type));
    setSelectedTypes((prev) =>
      allActive
        ? prev.filter((type) => !types.includes(type))
        : Array.from(new Set([...prev, ...types])),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <KpiCard
          label="Saldo Atual do Cofre"
          value={dashboard ? formatCurrencyBRL(dashboard.balance) : "—"}
          icon={Vault}
          iconTone="blue"
        />
        <KpiCard
          label="Entradas do Dia"
          value={dashboard ? formatCurrencyBRL(dashboard.periodIn) : "—"}
          icon={ArrowDownCircle}
          iconTone="green"
        />
        <KpiCard
          label="Saídas do Dia"
          value={dashboard ? formatCurrencyBRL(dashboard.periodOut) : "—"}
          icon={ArrowUpCircle}
          iconTone="red"
        />
        <KpiCard
          label="Pendentes de Confirmação"
          value={dashboard ? String(dashboard.pendingCount) : "—"}
          icon={AlertCircle}
          iconTone="amber"
          onClick={() =>
            setStatus(status === "PENDING" ? undefined : "PENDING")
          }
          active={status === "PENDING"}
        />
        <KpiCard
          label="Última Conferência"
          value={
            dashboard?.lastConfirmedAt
              ? formatDateTimeBR(dashboard.lastConfirmedAt)
              : "—"
          }
          icon={Clock3}
          iconTone="violet"
          comparison={dashboard?.lastConfirmedByUserName ?? undefined}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {canReceive && <SangriaDialog />}
        {canManualAdjustment && <WithdrawalDialog />}
        {canManualAdjustment && <ManualAdjustmentDialog />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            <TreasuryFiltersBar
              period={period}
              onPeriodChange={setPeriod}
              selectedTypes={selectedTypes}
              onToggleTypes={toggleTypes}
              status={status}
              onStatusChange={setStatus}
              search={search}
              onSearchChange={setSearch}
            />
            <SafeMovementsTable filter={filter} canConfirm={canConfirm} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <TreasuryTimeline />
          <TreasuryPeriodSummary
            range={range}
            movementsTotal={totalsOnly?.total ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
