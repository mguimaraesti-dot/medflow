"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  DollarSign,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useRecurringBills } from "./use-recurring-bills";
import { useDeactivateRecurringBill } from "./use-deactivate-recurring-bill";
import { useRecurringBillsSchedule } from "./use-recurring-bills-schedule";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { KpiCard } from "@/shared/components/kpi-card";
import { EmptyState } from "@/shared/components/empty-state";
import { ApiError } from "@/shared/lib/api-client";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { RecurrencePeriodicity } from "../domain/recurring-bill.entity";
import type { PayableStatus } from "@/features/accounts-payable/domain/accounts-payable.entity";
import type { RecurringBillScheduleRowDTO } from "../application/dtos/recurring-bills-schedule.response-dto";

// Duplicado de propósito (não importamos presentation de outra feature) —
// mesmo rótulo usado em accounts-payable-helpers.ts / accounts-payable-form.tsx.
const PERIODICITY_LABEL: Record<RecurrencePeriodicity, string> = {
  MONTHLY: "Mensal",
  BIWEEKLY: "Quinzenal",
  WEEKLY: "Semanal",
  YEARLY: "Anual",
};

const STATUS_LABEL: Record<PayableStatus, string> = {
  PENDING: "Pendente",
  OVERDUE: "Vencida",
  PAID: "Paga",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE_CLASS: Record<PayableStatus, string> = {
  PENDING:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  OVERDUE: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  PAID: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
  CANCELLED:
    "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const MONTH_LABEL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function scheduleRowKey(row: RecurringBillScheduleRowDTO): string {
  return row.accountsPayableId ?? row.recurringBillId;
}

/**
 * Ferramenta de planejamento financeiro das recorrências — mostra a
 * programação (ocorrências já geradas) do mês/ano selecionado, não só as
 * regras. Não simula datas além do que já foi batch-gerado no cadastro
 * (decisão de escopo — sem cron real, ver create-recurring-accounts-payable.use-case).
 */
export function RecurringBillsScheduleScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: schedule, isLoading } = useRecurringBillsSchedule(month, year);
  const { data: bills } = useRecurringBills();
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const deactivateRecurringBill = useDeactivateRecurringBill();

  const supplierById = useMemo(
    () => new Map(suppliers?.map((s) => [s.id, s])),
    [suppliers],
  );
  const categoryById = useMemo(
    () => new Map(categories?.map((c) => [c.id, c])),
    [categories],
  );

  const currentYear = now.getFullYear();
  const yearOptions = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  async function handleDeactivate(id: string) {
    try {
      await deactivateRecurringBill.mutateAsync(id);
      toast.success("Recorrência encerrada.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível encerrar.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Programações
          </h1>
          <p className="text-muted-foreground text-sm">
            Planejamento financeiro das contas recorrentes.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">
              Mês
            </span>
            <Select
              value={String(month)}
              onValueChange={(value) => setMonth(Number(value))}
            >
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_LABEL.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">
              Ano
            </span>
            <Select
              value={String(year)}
              onValueChange={(value) => setYear(Number(value))}
            >
              <SelectTrigger size="sm" className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {schedule && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total previsto"
            value={formatCurrencyBRL(schedule.summary.totalPrevisto)}
            icon={DollarSign}
            iconTone="blue"
            compact
          />
          <KpiCard
            label="Recorrências previstas"
            value={String(schedule.summary.quantidade)}
            icon={Layers}
            iconTone="violet"
            compact
          />
          <KpiCard
            label="Maior despesa"
            value={
              schedule.summary.maiorDespesa
                ? formatCurrencyBRL(schedule.summary.maiorDespesa.amount)
                : "—"
            }
            comparison={schedule.summary.maiorDespesa?.description}
            icon={AlertTriangle}
            iconTone="red"
            compact
          />
          <KpiCard
            label="Próxima geração"
            value={
              schedule.summary.proximaGeracao
                ? formatDateOnlyBR(schedule.summary.proximaGeracao.dueDate)
                : "—"
            }
            comparison={schedule.summary.proximaGeracao?.description}
            icon={CalendarClock}
            iconTone="green"
            compact
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Programação de {MONTH_LABEL[month - 1]}/{year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isLoading && schedule && schedule.rows.length === 0 && (
            <EmptyState
              icon={BarChart3}
              title="Nenhuma recorrência ativa."
              description="Cadastre uma conta recorrente em Contas a Pagar (checkbox 'Conta recorrente') para vê-la aqui."
            />
          )}

          {schedule && schedule.rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Data prevista</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.rows.map((row) => (
                  <TableRow key={scheduleRowKey(row)}>
                    <TableCell className="font-medium">
                      {supplierById.get(row.supplierId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.description}
                    </TableCell>
                    <TableCell>
                      {categoryById.get(row.categoryId)?.name ?? "—"}
                    </TableCell>
                    <TableCell>{PERIODICITY_LABEL[row.periodicity]}</TableCell>
                    <TableCell>
                      {row.dueDate ? formatDateOnlyBR(row.dueDate) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.amount ? formatCurrencyBRL(row.amount) : "—"}
                    </TableCell>
                    <TableCell>
                      {row.status ? (
                        <Badge
                          variant="outline"
                          className={STATUS_BADGE_CLASS[row.status]}
                        >
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recorrências ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {(!bills || bills.length === 0) && (
            <EmptyState
              icon={RefreshCw}
              title="Nenhuma recorrência cadastrada."
              description="Contas marcadas como recorrentes (aluguel, softwares) aparecem aqui."
            />
          )}

          {bills && bills.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">
                      {supplierById.get(bill.supplierId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bill.description}
                    </TableCell>
                    <TableCell>{PERIODICITY_LABEL[bill.periodicity]}</TableCell>
                    <TableCell>{formatCurrencyBRL(bill.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(bill.id)}
                      >
                        Encerrar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
