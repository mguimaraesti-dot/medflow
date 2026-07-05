"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import {
  AccountsPayableTable,
  type StatusFilter,
} from "./accounts-payable-table";
import { AccountsPayableFormDialog } from "./accounts-payable-form-dialog";
import { AccountsPayableDrawer } from "./accounts-payable-drawer";
import { useAccountsPayableSummary } from "./use-accounts-payable-summary";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { RecurringBillsPanel } from "@/features/recurring-bills/presentation/recurring-bills-panel";
import {
  PeriodSelector,
  computePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import { KpiCard } from "@/shared/components/kpi-card";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { AccountsPayableFormValues } from "./accounts-payable-form";

export function AccountsPayableScreen({
  permissions,
}: {
  permissions: string[];
}) {
  const can = (permission: string) => permissions.includes(permission);
  const canCreate = can(PERMISSIONS.PAYABLE_CREATE);
  const canPay = can(PERMISSIONS.PAYABLE_PAY);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateValues, setDuplicateValues] = useState<
    Partial<AccountsPayableFormValues> | undefined
  >();
  const [viewing, setViewing] = useState<AccountsPayableResponseDTO | null>(
    null,
  );

  const { data: categories } = useCategories("OUT");
  const { data: suppliers } = useSuppliers();
  const range = computePeriodRange(periodPreset, periodCustom);
  const { data: summary } = useAccountsPayableSummary({
    dueDateFrom: range.from,
    dueDateTo: range.to,
  });

  function openCreate() {
    setDuplicateValues(undefined);
    setCreateOpen(true);
  }

  function handleDuplicate(payable: AccountsPayableResponseDTO) {
    setDuplicateValues({
      supplierId: payable.supplierId,
      categoryId: payable.categoryId,
      description: payable.description,
      amount: Number(payable.amount),
    });
    setCreateOpen(true);
  }

  return (
    <Tabs defaultValue="payable">
      <TabsList>
        <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
        <TabsTrigger value="recurring">Recorrências</TabsTrigger>
      </TabsList>

      <TabsContent value="payable" className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Contas a Pagar</h2>
            <p className="text-muted-foreground text-sm">
              Gerencie e acompanhe todas as suas contas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodSelector
              preset={periodPreset}
              custom={periodCustom}
              onChange={(preset, custom) => {
                setPeriodPreset(preset);
                setPeriodCustom(custom);
              }}
            />
            {canCreate && (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            )}
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Total do período"
              value={formatCurrencyBRL(summary.total.amount)}
              comparison={`${summary.total.count} conta(s)`}
              icon={Wallet}
              iconTone="blue"
            />
            <KpiCard
              label="Hoje"
              value={formatCurrencyBRL(summary.dueToday.amount)}
              comparison={`${summary.dueToday.count} conta(s) vencem hoje`}
              icon={CalendarClock}
              iconTone="blue"
            />
            <KpiCard
              label="A vencer"
              value={formatCurrencyBRL(summary.upcoming.amount)}
              comparison={`${summary.upcoming.count} conta(s)`}
              icon={Clock}
              iconTone="green"
            />
            <KpiCard
              label="Vencidas"
              value={formatCurrencyBRL(summary.overdue.amount)}
              comparison={`${summary.overdue.count} conta(s)`}
              icon={AlertTriangle}
              iconTone="red"
            />
            <KpiCard
              label="Pagas"
              value={formatCurrencyBRL(summary.paid.amount)}
              comparison={`${summary.paid.count} conta(s)`}
              icon={CheckCircle2}
              iconTone="violet"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por descrição..."
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-[170px]">
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
            <SelectTrigger className="w-full sm:w-[190px]">
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
          {canCreate && (
            <Button type="button" variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <AccountsPayableTable
              canPay={canPay}
              canCreate={canCreate}
              status={status}
              categoryId={categoryId}
              search={search.trim() || undefined}
              dueDateFrom={range.from}
              dueDateTo={range.to}
              onView={setViewing}
              onDuplicate={handleDuplicate}
              onCreateNew={openCreate}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="recurring">
        <RecurringBillsPanel />
      </TabsContent>

      <AccountsPayableFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={duplicateValues}
      />
      <AccountsPayableDrawer
        payable={viewing}
        supplierName={
          viewing
            ? (suppliers?.find((s) => s.id === viewing.supplierId)?.name ??
              undefined)
            : undefined
        }
        categoryName={
          viewing
            ? (categories?.find((c) => c.id === viewing.categoryId)?.name ??
              undefined)
            : undefined
        }
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      />
    </Tabs>
  );
}
