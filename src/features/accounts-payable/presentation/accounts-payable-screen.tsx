"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Settings2,
  Wallet,
  X,
} from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import {
  AccountsPayableTable,
  type StatusFilter,
  type VisibleColumns,
} from "./accounts-payable-table";
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
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import { KpiCard } from "@/shared/components/kpi-card";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
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

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [recurringOnly, setRecurringOnly] = useState<
    "RECURRING" | "NON_RECURRING" | undefined
  >();
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    category: true,
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

  const { data: categories } = useCategories("OUT");
  const { data: suppliers } = useSuppliers();
  const range = computePeriodRange(periodPreset, periodCustom);
  const { summary, trend } = useAccountsPayableSummaryTrend(range);

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
    setCategoryId(undefined);
    setSupplierId(undefined);
    setRecurringOnly(undefined);
  }

  const supplierName = suppliers?.find((s) => s.id === supplierId)?.name;
  const categoryName = categories?.find((c) => c.id === categoryId)?.name;
  const hasNonDefaultFilters =
    status !== "ALL" ||
    Boolean(categoryId) ||
    Boolean(supplierId) ||
    Boolean(recurringOnly) ||
    Boolean(search.trim());

  // Cards de resumo como atalhos de filtro (Sprint UX/UI 11) — "ativo" é
  // derivado de {status, periodPreset}, nunca um estado novo duplicado.
  function filterByTotal() {
    setStatus("ALL");
  }
  function filterByDueToday() {
    setPeriodPreset("TODAY");
    setPeriodCustom(undefined);
    setStatus("PENDING");
  }
  function filterByUpcoming() {
    setStatus("PENDING");
  }
  function filterByOverdue() {
    setStatus("OVERDUE");
  }
  function filterByPaid() {
    setStatus("PAID");
  }

  const isTotalActive = status === "ALL";
  const isDueTodayActive = status === "PENDING" && periodPreset === "TODAY";
  const isUpcomingActive = status === "PENDING" && periodPreset !== "TODAY";
  const isOverdueActive = status === "OVERDUE";
  const isPaidActive = status === "PAID";

  const paidPercentOfPeriod =
    summary && Number(summary.total.amount) > 0
      ? (Number(summary.paid.amount) / Number(summary.total.amount)) * 100
      : null;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Contas a Pagar</h1>

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

      <div className="flex flex-col flex-wrap gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-[340px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar beneficiário, descrição ou boleto..."
            className="pl-9"
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
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger size="sm" className="w-full lg:w-auto">
            <SelectValue />
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
          <SelectTrigger size="sm" className="w-full lg:w-auto">
            <SelectValue />
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
          <SelectTrigger size="sm" className="w-full lg:w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as recorrências</SelectItem>
            <SelectItem value="RECURRING">Apenas recorrentes</SelectItem>
            <SelectItem value="NON_RECURRING">
              Apenas não recorrentes
            </SelectItem>
          </SelectContent>
        </Select>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreate}
            className={cn(
              "h-12 px-6 font-semibold shadow-sm transition-all hover:-translate-y-px hover:shadow-md lg:ml-auto",
            )}
          >
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Mais opções"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-filter">Beneficiário</Label>
              <Select
                value={supplierId ?? "ALL"}
                onValueChange={(value) =>
                  setSupplierId(value === "ALL" ? undefined : value)
                }
              >
                <SelectTrigger id="supplier-filter" className="w-full">
                  <SelectValue />
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
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Colunas visíveis</Label>
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
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {hasNonDefaultFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtros aplicados:</span>
          {status !== "ALL" && (
            <Badge variant="secondary" className="gap-1">
              Status: {STATUS_FILTER_LABEL[status]}
              <button
                type="button"
                aria-label="Remover filtro de status"
                onClick={() => setStatus("ALL")}
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

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <AccountsPayableTable
          canPay={canPay}
          canCreate={canCreate}
          canDelete={canDelete}
          status={status}
          categoryId={categoryId}
          supplierId={supplierId}
          recurringOnly={recurringOnly}
          search={search.trim() || undefined}
          dueDateFrom={range.from}
          dueDateTo={range.to}
          visibleColumns={visibleColumns}
          onView={handleView}
          onEdit={setEditing}
          onDuplicate={handleDuplicate}
          onCreateNew={openCreate}
        />
      </div>

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
