"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Clock,
  Columns3,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import {
  AccountsPayableTable,
  type StatusFilter,
  type VisibleColumns,
} from "./accounts-payable-table";
import { AccountsPayableCards } from "./accounts-payable-cards";
import { AccountsPayableFormDialog } from "./accounts-payable-form-dialog";
import { AccountsPayableDrawer } from "./accounts-payable-drawer";
import { AccountsPayableEditDialog } from "./accounts-payable-edit-dialog";
import { useAccountsPayableSummaryTrend } from "./use-accounts-payable-summary-trend";
import { formatCardSubtitle } from "./accounts-payable-helpers";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import {
  PeriodSelector,
  computePeriodRange,
  PERIOD_PRESET_OPTIONS,
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import {
  MobileFilterSheet,
  FilterAccordionGroup,
  FilterChipGroup,
  FilterSearchList,
} from "@/shared/components/mobile-filter-sheet";
import { KpiCard } from "@/shared/components/kpi-card";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { AccountsPayableFormValues } from "./accounts-payable-form";

const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  ALL: "Todos os status",
  PENDING: "Pendentes",
  OVERDUE: "Vencidas",
  PAID: "Pagas",
  CANCELLED: "Canceladas",
};

function TrendComparison({
  count,
  countLabel,
  changePercent,
  comparisonLabel = "período anterior",
}: {
  count: number;
  countLabel?: string;
  changePercent: number | null;
  comparisonLabel?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p>{countLabel ?? formatCardSubtitle(count)}</p>
      {changePercent !== null && (
        <p className="flex items-center gap-1">
          {changePercent >= 0 ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {Math.abs(changePercent).toFixed(0)}% vs {comparisonLabel}
        </p>
      )}
    </div>
  );
}

export function AccountsPayableScreen({
  permissions,
}: {
  permissions: string[];
}) {
  const can = (permission: string) => permissions.includes(permission);
  const canCreate = can(PERMISSIONS.PAYABLE_CREATE);
  const canPay = can(PERMISSIONS.PAYABLE_PAY);
  const canDelete = can(PERMISSIONS.PAYABLE_DELETE);
  // Mesmo corte que a tela já usa pra empilhar os filtros (`lg:flex-row`)
  // e esconder colunas da tabela (`hidden lg:table-cell`) — um só valor
  // de breakpoint pra tudo que "encolhe" nesta tela.
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [recurringOnly, setRecurringOnly] = useState<
    "RECURRING" | "NON_RECURRING" | undefined
  >();
  const [pendingReminderOnly, setPendingReminderOnly] = useState(false);
  // Intervalo de data só da LISTA (nunca dos KPIs) — setado pelo clique em
  // "Hoje" (a única categoria que restringe data, não só status). Os 5
  // KPIs continuam usando `range` (derivado só de periodPreset/periodCustom,
  // nunca alterado por clique de KPI) como referência fixa do período.
  const [listDueDateOverride, setListDueDateOverride] = useState<
    { from: Date; to: Date } | undefined
  >(undefined);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    category: true,
    recurring: true,
    confirmedBy: true,
    attachments: true,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateValues, setDuplicateValues] = useState<
    Partial<AccountsPayableFormValues> | undefined
  >();
  const [viewing, setViewing] = useState<AccountsPayableResponseDTO | null>(
    null,
  );
  const [viewingTab, setViewingTab] = useState<
    "account" | "history" | "attachments"
  >("account");
  const [editing, setEditing] = useState<AccountsPayableResponseDTO | null>(
    null,
  );

  function handleView(
    payable: AccountsPayableResponseDTO,
    tab: "account" | "history" | "attachments" = "account",
  ) {
    setViewingTab(tab);
    setViewing(payable);
  }

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: categories } = useCategories("OUT");
  const { data: suppliers } = useSuppliers();
  const range = computePeriodRange(periodPreset, periodCustom);
  const { summary, trend } = useAccountsPayableSummaryTrend(range);
  // Só a lista usa isto — os KPIs acima usam `range` direto, sempre.
  const listRange = listDueDateOverride ?? range;

  function supplierNameOf(payable: AccountsPayableResponseDTO | null) {
    return payable
      ? (suppliers?.find((s) => s.id === payable.supplierId)?.name ?? undefined)
      : undefined;
  }
  function categoryNameOf(payable: AccountsPayableResponseDTO | null) {
    return payable
      ? (categories?.find((c) => c.id === payable.categoryId)?.name ??
          undefined)
      : undefined;
  }

  function openCreate() {
    setDuplicateValues(undefined);
    setCreateOpen(true);
  }

  function handleDuplicate(payable: AccountsPayableResponseDTO) {
    setEditing(null);
    setDuplicateValues({
      supplierId: payable.supplierId,
      categoryId: payable.categoryId,
      description: payable.description,
      amount: Number(payable.amount),
    });
    setCreateOpen(true);
  }

  function clearFilters() {
    setPeriodPreset("MONTH");
    setPeriodCustom(undefined);
    setSearch("");
    setStatus("ALL");
    setListDueDateOverride(undefined);
    setCategoryId(undefined);
    setSupplierId(undefined);
    setRecurringOnly(undefined);
    setPendingReminderOnly(false);
  }

  // Reaproveitado por qualquer mudança MANUAL de status (Select desktop,
  // chips mobile, "x" do chip de filtro aplicado) — nunca deixa o
  // override de "hoje" sobreviver a uma troca de status que não veio do
  // clique no KPI "Hoje" em si (senão a lista ficaria presa em hoje
  // mesmo depois do usuário escolher outro status manualmente).
  function handleStatusChange(newStatus: StatusFilter) {
    setStatus(newStatus);
    setListDueDateOverride(undefined);
  }

  const supplierName = suppliers?.find((s) => s.id === supplierId)?.name;
  const categoryName = categories?.find((c) => c.id === categoryId)?.name;
  // Resumo mostrado no cabeçalho de cada grupo recolhível do painel
  // mobile — dá pra ler o estado inteiro dos filtros sem abrir nada.
  const periodSummary =
    periodPreset === "CUSTOM"
      ? `${formatDateOnlyBR(range.from)} - ${formatDateOnlyBR(range.to)}`
      : (PERIOD_PRESET_OPTIONS.find((option) => option.value === periodPreset)
          ?.label ?? "Período");
  const statusSummary =
    status === "ALL" ? "Todos" : STATUS_FILTER_LABEL[status];
  const categorySummary = categoryId ? (categoryName ?? "—") : "Todas";
  const recurringSummary =
    recurringOnly === "RECURRING"
      ? "Recorrentes"
      : recurringOnly === "NON_RECURRING"
        ? "Não recorrentes"
        : "Todas";
  const supplierSummary = supplierId ? (supplierName ?? "—") : "Todos";
  const activeFilterCount = [
    status !== "ALL",
    Boolean(listDueDateOverride),
    Boolean(categoryId),
    Boolean(supplierId),
    Boolean(recurringOnly),
    Boolean(search.trim()),
    pendingReminderOnly,
  ].filter(Boolean).length;
  const hasNonDefaultFilters =
    status !== "ALL" ||
    Boolean(listDueDateOverride) ||
    Boolean(categoryId) ||
    Boolean(supplierId) ||
    Boolean(recurringOnly) ||
    Boolean(search.trim()) ||
    pendingReminderOnly;

  // Cards de resumo como atalhos de filtro (Sprint UX/UI 11) — "ativo" é
  // derivado de {status, periodPreset}, nunca um estado novo duplicado.
  function filterByTotal() {
    setStatus("ALL");
    setListDueDateOverride(undefined);
  }
  function filterByDueToday() {
    setStatus("PENDING");
    // Timezone-safe (mesmo helper do PeriodSelector) — nunca `new Date()`
    // cru, que trunca em UTC e erra a virada de dia em Brasília.
    setListDueDateOverride(computePeriodRange("TODAY", undefined));
  }
  function filterByUpcoming() {
    setStatus("PENDING");
    setListDueDateOverride(undefined);
  }
  function filterByOverdue() {
    setStatus("OVERDUE");
    setListDueDateOverride(undefined);
  }
  function filterByPaid() {
    setStatus("PAID");
    setListDueDateOverride(undefined);
  }

  const isTotalActive = status === "ALL";
  const isDueTodayActive =
    status === "PENDING" && listDueDateOverride !== undefined;
  const isUpcomingActive =
    status === "PENDING" && listDueDateOverride === undefined;
  const isOverdueActive = status === "OVERDUE";
  const isPaidActive = status === "PAID";

  const paidPercentOfPeriod =
    summary && Number(summary.total.amount) > 0
      ? (Number(summary.paid.amount) / Number(summary.total.amount)) * 100
      : null;

  return (
    <div className="space-y-5">
      {summary && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <KpiCard
            label="Total do período"
            value={formatCurrencyBRL(summary.total.amount)}
            comparison={
              <TrendComparison
                count={summary.total.count}
                changePercent={trend?.total ?? null}
              />
            }
            icon={Wallet}
            iconTone="blue"
            compact
            onClick={filterByTotal}
            active={isTotalActive}
          />
          <KpiCard
            label="Hoje"
            value={formatCurrencyBRL(summary.dueToday.amount)}
            comparison={
              <TrendComparison
                count={summary.dueToday.count}
                countLabel={
                  summary.dueToday.count === 0
                    ? "Nenhum vencimento"
                    : `${formatCardSubtitle(summary.dueToday.count)} ${
                        summary.dueToday.count === 1 ? "vence" : "vencem"
                      } hoje`
                }
                changePercent={trend?.dueToday ?? null}
                comparisonLabel="ontem"
              />
            }
            icon={CalendarClock}
            iconTone="blue"
            compact
            onClick={filterByDueToday}
            active={isDueTodayActive}
            emphasized={summary.dueToday.count > 0}
          />
          <KpiCard
            label="A vencer"
            value={formatCurrencyBRL(summary.upcoming.amount)}
            comparison={
              <TrendComparison
                count={summary.upcoming.count}
                changePercent={trend?.upcoming ?? null}
              />
            }
            icon={Clock}
            iconTone="green"
            compact
            onClick={filterByUpcoming}
            active={isUpcomingActive}
          />
          <KpiCard
            label="Vencidas"
            value={formatCurrencyBRL(summary.overdue.amount)}
            comparison={
              <TrendComparison
                count={summary.overdue.count}
                changePercent={trend?.overdue ?? null}
              />
            }
            icon={AlertTriangle}
            iconTone="red"
            compact
            onClick={filterByOverdue}
            active={isOverdueActive}
            emphasized={summary.overdue.count > 0}
          />
          <KpiCard
            label="Pagas"
            value={formatCurrencyBRL(summary.paid.amount)}
            comparison={
              <div className="space-y-0.5">
                <TrendComparison
                  count={summary.paid.count}
                  countLabel={formatCardSubtitle(summary.paid.count, "pagas")}
                  changePercent={trend?.paid ?? null}
                />
                {paidPercentOfPeriod !== null && (
                  <p>{paidPercentOfPeriod.toFixed(0)}% do período</p>
                )}
              </div>
            }
            icon={CheckCircle2}
            iconTone="violet"
            compact
            onClick={filterByPaid}
            active={isPaidActive}
          />
        </div>
      )}

      {isMobile ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar contas..."
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
              <PeriodSelector
                variant="chips"
                preset={periodPreset}
                custom={periodCustom}
                onChange={(preset, custom) => {
                  setPeriodPreset(preset);
                  setPeriodCustom(custom);
                }}
              />
            </FilterAccordionGroup>
            <FilterAccordionGroup
              groupKey="status"
              label="Status"
              summary={statusSummary}
              isActive={status !== "ALL"}
            >
              <FilterChipGroup
                value={status === "ALL" ? undefined : status}
                onChange={(value) => handleStatusChange(value ?? "ALL")}
                allLabel="Todos"
                options={[
                  { value: "PENDING", label: "Pendentes" },
                  { value: "OVERDUE", label: "Vencidas" },
                  { value: "PAID", label: "Pagas" },
                  { value: "CANCELLED", label: "Canceladas" },
                ]}
              />
            </FilterAccordionGroup>
            <FilterAccordionGroup
              groupKey="category"
              label="Categorias"
              summary={categorySummary}
              isActive={Boolean(categoryId)}
            >
              <FilterSearchList
                value={categoryId}
                onChange={setCategoryId}
                allLabel="Todas"
                searchPlaceholder="Buscar categoria…"
                itemNamePlural="categorias"
                options={
                  categories?.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })) ?? []
                }
              />
            </FilterAccordionGroup>
            <FilterAccordionGroup
              groupKey="recurring"
              label="Recorrências"
              summary={recurringSummary}
              isActive={Boolean(recurringOnly)}
            >
              <FilterChipGroup
                value={recurringOnly}
                onChange={setRecurringOnly}
                allLabel="Todas"
                options={[
                  { value: "RECURRING", label: "Recorrentes" },
                  { value: "NON_RECURRING", label: "Não recorrentes" },
                ]}
              />
            </FilterAccordionGroup>
            <FilterAccordionGroup
              groupKey="supplier"
              label="Beneficiários"
              summary={supplierSummary}
              isActive={Boolean(supplierId)}
            >
              <FilterSearchList
                value={supplierId}
                onChange={setSupplierId}
                allLabel="Todos"
                searchPlaceholder="Buscar beneficiário…"
                itemNamePlural="beneficiários"
                options={
                  suppliers?.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                  })) ?? []
                }
              />
            </FilterAccordionGroup>
            <FilterAccordionGroup
              groupKey="pendingReminder"
              label="Lembrete de WhatsApp"
              summary={pendingReminderOnly ? "Pendentes de envio" : "Todas"}
              isActive={pendingReminderOnly}
            >
              <FilterChipGroup
                value={pendingReminderOnly ? "PENDING_SEND" : undefined}
                onChange={(value) =>
                  setPendingReminderOnly(value === "PENDING_SEND")
                }
                allLabel="Todas"
                options={[
                  { value: "PENDING_SEND", label: "Pendentes de envio" },
                ]}
              />
            </FilterAccordionGroup>
          </MobileFilterSheet>
        </div>
      ) : (
        <div className="flex flex-col flex-wrap gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[220px]">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar contas..."
              className="h-8 pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <PeriodSelector
            variant="select"
            size="sm"
            preset={periodPreset}
            custom={periodCustom}
            onChange={(preset, custom) => {
              setPeriodPreset(preset);
              setPeriodCustom(custom);
            }}
          />

          <Select
            value={status}
            onValueChange={(value) => handleStatusChange(value as StatusFilter)}
          >
            <SelectTrigger size="sm" className="w-full lg:w-[130px]">
              <SelectValue>
                {status === "ALL" ? "Status" : STATUS_FILTER_LABEL[status]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="PENDING">Pendentes</SelectItem>
              <SelectItem value="OVERDUE">Vencidas</SelectItem>
              <SelectItem value="PAID">Pagas</SelectItem>
              <SelectItem value="CANCELLED">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryId ?? "ALL"}
            onValueChange={(value) =>
              setCategoryId(value === "ALL" ? undefined : value)
            }
          >
            <SelectTrigger size="sm" className="w-full lg:w-[150px]">
              <SelectValue>
                {categoryId ? (categoryName ?? "—") : "Categorias"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as categorias</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={recurringOnly ?? "ALL"}
            onValueChange={(value) =>
              setRecurringOnly(
                value === "ALL"
                  ? undefined
                  : (value as "RECURRING" | "NON_RECURRING"),
              )
            }
          >
            <SelectTrigger size="sm" className="w-full lg:w-[150px]">
              <SelectValue>
                {recurringOnly === "RECURRING"
                  ? "Apenas recorrentes"
                  : recurringOnly === "NON_RECURRING"
                    ? "Apenas não recorrentes"
                    : "Recorrências"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as recorrências</SelectItem>
              <SelectItem value="RECURRING">Apenas recorrentes</SelectItem>
              <SelectItem value="NON_RECURRING">
                Apenas não recorrentes
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={supplierId ?? "ALL"}
            onValueChange={(value) =>
              setSupplierId(value === "ALL" ? undefined : value)
            }
          >
            <SelectTrigger size="sm" className="w-full lg:w-[150px]">
              <SelectValue>
                {supplierId ? (supplierName ?? "—") : "Beneficiários"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os beneficiários</SelectItem>
              {suppliers?.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "w-full lg:w-auto",
              pendingReminderOnly &&
                "border-transparent bg-amber-500 text-white hover:bg-amber-600 hover:text-white",
            )}
            onClick={() => setPendingReminderOnly((prev) => !prev)}
          >
            <WhatsAppIcon className="h-4 w-4" />
            Pendentes de envio
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Columns3 className="h-4 w-4" />
                Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={visibleColumns.category}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      category: checked === true,
                    }))
                  }
                />
                Categoria
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={visibleColumns.recurring}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      recurring: checked === true,
                    }))
                  }
                />
                Recorrência
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={visibleColumns.confirmedBy}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      confirmedBy: checked === true,
                    }))
                  }
                />
                Confirmado por
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={visibleColumns.attachments}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      attachments: checked === true,
                    }))
                  }
                />
                Documentos
              </label>
            </PopoverContent>
          </Popover>

          {canCreate && (
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              className="lg:ml-auto"
            >
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          )}
        </div>
      )}

      {hasNonDefaultFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtros aplicados:</span>
          {status !== "ALL" && (
            <Badge variant="secondary" className="gap-1">
              Status: {STATUS_FILTER_LABEL[status]}
              <button
                type="button"
                aria-label="Remover filtro de status"
                onClick={() => handleStatusChange("ALL")}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {listDueDateOverride && (
            <Badge variant="secondary" className="gap-1">
              Vencem hoje
              <button
                type="button"
                aria-label="Remover filtro de vencimento hoje"
                onClick={() => setListDueDateOverride(undefined)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {categoryId && (
            <Badge variant="secondary" className="gap-1">
              Categoria: {categoryName ?? "—"}
              <button
                type="button"
                aria-label="Remover filtro de categoria"
                onClick={() => setCategoryId(undefined)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {supplierId && (
            <Badge variant="secondary" className="gap-1">
              Beneficiário: {supplierName ?? "—"}
              <button
                type="button"
                aria-label="Remover filtro de beneficiário"
                onClick={() => setSupplierId(undefined)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {recurringOnly && (
            <Badge variant="secondary" className="gap-1">
              Recorrência:{" "}
              {recurringOnly === "RECURRING"
                ? "Apenas recorrentes"
                : "Apenas não recorrentes"}
              <button
                type="button"
                aria-label="Remover filtro de recorrência"
                onClick={() => setRecurringOnly(undefined)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {search.trim() && (
            <Badge variant="secondary" className="gap-1">
              Busca: {search.trim()}
              <button
                type="button"
                aria-label="Remover busca"
                onClick={() => setSearch("")}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {pendingReminderOnly && (
            <Badge variant="secondary" className="gap-1">
              Lembrete: Pendentes de envio
              <button
                type="button"
                aria-label="Remover filtro de pendentes de envio"
                onClick={() => setPendingReminderOnly(false)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        </div>
      )}

      {isMobile ? (
        // pb-20 dá folga pro FAB fixo (canto inferior direito) nunca
        // ficar em cima do último card ao rolar até o fim da lista.
        <div className="pb-20">
          <AccountsPayableCards
            canPay={canPay}
            canCreate={canCreate}
            canDelete={canDelete}
            status={status}
            categoryId={categoryId}
            supplierId={supplierId}
            recurringOnly={recurringOnly}
            search={debouncedSearch.trim() || undefined}
            dueDateFrom={listRange.from}
            dueDateTo={listRange.to}
            pendingReminderOnly={pendingReminderOnly}
            onView={handleView}
            onEdit={setEditing}
            onDuplicate={handleDuplicate}
            onCreateNew={openCreate}
          />
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <AccountsPayableTable
            canPay={canPay}
            canCreate={canCreate}
            canDelete={canDelete}
            status={status}
            categoryId={categoryId}
            supplierId={supplierId}
            recurringOnly={recurringOnly}
            search={debouncedSearch.trim() || undefined}
            dueDateFrom={listRange.from}
            dueDateTo={listRange.to}
            pendingReminderOnly={pendingReminderOnly}
            visibleColumns={visibleColumns}
            onView={handleView}
            onEdit={setEditing}
            onDuplicate={handleDuplicate}
            onCreateNew={openCreate}
          />
        </div>
      )}

      {isMobile && canCreate && (
        <Button
          type="button"
          size="icon"
          className="fixed right-5 bottom-5 z-20 h-14 w-14 rounded-full shadow-lg"
          onClick={openCreate}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Nova Conta</span>
        </Button>
      )}

      <AccountsPayableFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={duplicateValues}
      />
      <AccountsPayableDrawer
        payable={viewing}
        supplierName={supplierNameOf(viewing)}
        categoryName={categoryNameOf(viewing)}
        canPay={canPay}
        canEdit={canCreate}
        canDelete={canDelete}
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        onEdit={(payable) => {
          setViewing(null);
          setEditing(payable);
        }}
        onOpenOccurrence={setViewing}
        initialTab={viewingTab}
      />
      <AccountsPayableEditDialog
        payable={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
