"use client";

import { useState } from "react";
import {
  Vault,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock3,
  AlertCircle,
  Search,
} from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useSafeMovements } from "./use-safe-movements";
import { useTreasuryDashboardSummary } from "./use-treasury-dashboard-summary";
import { SafeMovementsTable } from "./safe-movements-table";
import { SafeMovementCards } from "./safe-movement-cards";
import { SangriaDialog } from "./sangria-dialog";
import { WithdrawalDialog } from "./withdrawal-dialog";
import { ManualAdjustmentDialog } from "./manual-adjustment-dialog";
import {
  TreasuryFiltersBar,
  computeQuickPeriodRange,
  PERIOD_OPTIONS,
  DIRECTION_OPTIONS,
  ORIGIN_OPTIONS,
  type QuickPeriod,
} from "./treasury-filters-bar";
import { TreasuryPeriodSummary } from "./treasury-period-summary";
import { TreasuryTimeline } from "./treasury-timeline";
import {
  MobileFilterSheet,
  FilterAccordionGroup,
  FilterChipGroup,
  FilterChip,
} from "@/shared/components/mobile-filter-sheet";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { KpiCard } from "@/shared/components/kpi-card";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import type {
  SafeMovementType,
  SafeMovementStatus,
} from "../domain/safe-movement.entity";

/** Acha, entre um grupo de opções (Tipo/Origem), a única cujo `types` bate exatamente com a seleção atual — mesma checagem que já decidia o chip "ativo" na barra de filtros desktop, só reaproveitada pro resumo do accordion mobile. */
function matchingOption<T extends { label: string; types: SafeMovementType[] }>(
  options: T[],
  selectedTypes: SafeMovementType[],
): T | undefined {
  return options.find(
    (option) =>
      option.types.length === selectedTypes.length &&
      option.types.every((type) => selectedTypes.includes(type)),
  );
}

/**
 * Tesouraria — dashboard de indicadores + tabela rica com Origem/
 * Categoria/Status/Ações, filtros rápidos e conferência gerencial do
 * fechamento de caixa (Refinamento UX/UI Tesouraria). Abaixo de `lg`,
 * mesmo padrão mobile de Contas a Pagar: KPIs em rolagem horizontal,
 * cards em vez de tabela, painel de filtros em bottom sheet.
 */
export function TreasuryScreen({ permissions }: { permissions: string[] }) {
  const can = (permission: string) => permissions.includes(permission);
  const canReceive = can(PERMISSIONS.TREASURY_SANGRIA);
  const canManualAdjustment = can(PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT);
  const canConfirm = can(PERMISSIONS.TREASURY_CONFIRM_MOVEMENT);
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const [period, setPeriod] = useState<QuickPeriod>("TODAY");
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

  /** Chips de tipo (Entradas/Saídas/Recepção/Contas a Pagar/Ajustes) são mutuamente exclusivos — clicar substitui a seleção em vez de somar; clicar de novo no mesmo limpa o filtro. */
  function toggleTypes(types: SafeMovementType[]) {
    const isSameSelection =
      selectedTypes.length === types.length &&
      types.every((type) => selectedTypes.includes(type));
    setSelectedTypes(isSameSelection ? [] : types);
  }

  function clearFilters() {
    setPeriod("TODAY");
    setSelectedTypes([]);
    setStatus(undefined);
    setSearch("");
  }

  const directionMatch = matchingOption(DIRECTION_OPTIONS, selectedTypes);
  const originMatch = matchingOption(ORIGIN_OPTIONS, selectedTypes);
  const periodSummary =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ??
    "Período";
  const statusSummary =
    status === "PENDING"
      ? "Pendentes"
      : status === "CONFIRMED"
        ? "Confirmadas"
        : "Todos";
  const activeFilterCount = [
    selectedTypes.length > 0,
    status !== undefined,
    Boolean(search.trim()),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        <div className="w-[150px] shrink-0 lg:contents">
          <KpiCard
            label="Saldo Atual do Cofre"
            value={dashboard ? formatCurrencyBRL(dashboard.balance) : "—"}
            icon={Vault}
            iconTone="blue"
          />
        </div>
        <div className="w-[150px] shrink-0 lg:contents">
          <KpiCard
            label="Entradas do Dia"
            value={dashboard ? formatCurrencyBRL(dashboard.periodIn) : "—"}
            icon={ArrowDownCircle}
            iconTone="green"
          />
        </div>
        <div className="w-[150px] shrink-0 lg:contents">
          <KpiCard
            label="Saídas do Dia"
            value={dashboard ? formatCurrencyBRL(dashboard.periodOut) : "—"}
            icon={ArrowUpCircle}
            iconTone="red"
          />
        </div>
        <div className="w-[150px] shrink-0 lg:contents">
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
        </div>
        <div className="w-[150px] shrink-0 lg:contents">
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
      </div>

      <div
        className={
          isMobile
            ? "grid grid-cols-3 gap-2"
            : "flex flex-col gap-3 sm:flex-row"
        }
      >
        {canReceive && <SangriaDialog compact={isMobile} />}
        {canManualAdjustment && <WithdrawalDialog compact={isMobile} />}
        {canManualAdjustment && <ManualAdjustmentDialog compact={isMobile} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardContent className="space-y-4 pt-6">
            {isMobile ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Buscar..."
                    className="h-9 pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <MobileFilterSheet
                  activeCount={activeFilterCount}
                  onClear={clearFilters}
                >
                  <FilterAccordionGroup
                    groupKey="period"
                    label="Período"
                    summary={periodSummary}
                    isActive
                  >
                    <div className="flex flex-wrap gap-2">
                      {PERIOD_OPTIONS.map((option) => (
                        <FilterChip
                          key={option.value}
                          selected={period === option.value}
                          onClick={() => setPeriod(option.value)}
                        >
                          {option.label}
                        </FilterChip>
                      ))}
                    </div>
                  </FilterAccordionGroup>
                  <FilterAccordionGroup
                    groupKey="type"
                    label="Tipo"
                    summary={directionMatch?.label ?? "Todos"}
                    isActive={Boolean(directionMatch)}
                  >
                    <FilterChipGroup
                      value={directionMatch?.label}
                      onChange={(label) => {
                        const option = DIRECTION_OPTIONS.find(
                          (candidate) => candidate.label === label,
                        );
                        toggleTypes(option ? option.types : []);
                      }}
                      allLabel="Todos"
                      options={DIRECTION_OPTIONS.map((option) => ({
                        value: option.label,
                        label: option.label,
                      }))}
                    />
                  </FilterAccordionGroup>
                  <FilterAccordionGroup
                    groupKey="status"
                    label="Status"
                    summary={statusSummary}
                    isActive={status !== undefined}
                  >
                    <FilterChipGroup
                      value={status}
                      onChange={setStatus}
                      allLabel="Todos"
                      options={[
                        { value: "PENDING", label: "Pendentes" },
                        { value: "CONFIRMED", label: "Confirmadas" },
                      ]}
                    />
                  </FilterAccordionGroup>
                  <FilterAccordionGroup
                    groupKey="origin"
                    label="Origem"
                    summary={originMatch?.label ?? "Todas"}
                    isActive={Boolean(originMatch)}
                  >
                    <FilterChipGroup
                      value={originMatch?.label}
                      onChange={(label) => {
                        const option = ORIGIN_OPTIONS.find(
                          (candidate) => candidate.label === label,
                        );
                        toggleTypes(option ? option.types : []);
                      }}
                      allLabel="Todas"
                      options={ORIGIN_OPTIONS.map((option) => ({
                        value: option.label,
                        label: option.label,
                      }))}
                    />
                  </FilterAccordionGroup>
                </MobileFilterSheet>
              </div>
            ) : (
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
            )}
            {isMobile ? (
              <SafeMovementCards filter={filter} canConfirm={canConfirm} />
            ) : (
              <SafeMovementsTable filter={filter} canConfirm={canConfirm} />
            )}
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
