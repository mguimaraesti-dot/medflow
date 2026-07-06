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
  SlidersHorizontal,
  Wallet,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { AccountsPayableFormValues } from "./accounts-payable-form";

function TrendComparison({
  count,
  changePercent,
}: {
  count: number;
  changePercent: number | null;
}) {
  return (
    <div className="space-y-0.5">
      <p>{count} conta(s)</p>
      {changePercent !== null && (
        <p className="flex items-center gap-1">
          {changePercent >= 0 ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {Math.abs(changePercent).toFixed(0)}% vs período anterior
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
  const [editing, setEditing] = useState<AccountsPayableResponseDTO | null>(
    null,
  );

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Contas a Pagar
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie pagamentos, boletos e fornecedores.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            Período
          </span>
          <PeriodSelector
            variant="select"
            preset={periodPreset}
            custom={periodCustom}
            onChange={(preset, custom) => {
              setPeriodPreset(preset);
              setPeriodCustom(custom);
            }}
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
          />
          <KpiCard
            label="Hoje"
            value={formatCurrencyBRL(summary.dueToday.amount)}
            comparison={
              <p className="text-amber-600 dark:text-amber-400">
                {summary.dueToday.count} conta(s) vencem hoje
              </p>
            }
            icon={CalendarClock}
            iconTone="blue"
            compact
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
          />
          <KpiCard
            label="Pagas"
            value={formatCurrencyBRL(summary.paid.amount)}
            comparison={
              <TrendComparison
                count={summary.paid.count}
                changePercent={trend?.paid ?? null}
              />
            }
            icon={CheckCircle2}
            iconTone="violet"
            compact
          />
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por fornecedor, descrição ou número..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger size="sm" className="w-full lg:w-[150px]">
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
          <SelectTrigger size="sm" className="w-full lg:w-[170px]">
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
          <SelectTrigger size="sm" className="w-full lg:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas (recorrência)</SelectItem>
            <SelectItem value="RECURRING">Apenas recorrentes</SelectItem>
            <SelectItem value="NON_RECURRING">
              Apenas não recorrentes
            </SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={visibleColumns.category}
              onCheckedChange={(checked) =>
                setVisibleColumns((prev) => ({
                  ...prev,
                  category: checked,
                }))
              }
              onSelect={(event) => event.preventDefault()}
            >
              Categoria
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.confirmedBy}
              onCheckedChange={(checked) =>
                setVisibleColumns((prev) => ({
                  ...prev,
                  confirmedBy: checked,
                }))
              }
              onSelect={(event) => event.preventDefault()}
            >
              Confirmado por
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.attachments}
              onCheckedChange={(checked) =>
                setVisibleColumns((prev) => ({
                  ...prev,
                  attachments: checked,
                }))
              }
              onSelect={(event) => event.preventDefault()}
            >
              Documentos
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {canCreate && (
          <Button
            type="button"
            onClick={openCreate}
            className={cn("lg:ml-auto")}
          >
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
        )}
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <AccountsPayableTable
          canPay={canPay}
          canCreate={canCreate}
          canDelete={canDelete}
          status={status}
          categoryId={categoryId}
          recurringOnly={recurringOnly}
          search={search.trim() || undefined}
          dueDateFrom={range.from}
          dueDateTo={range.to}
          visibleColumns={visibleColumns}
          onView={setViewing}
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
      />
      <AccountsPayableEditDialog
        payable={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
