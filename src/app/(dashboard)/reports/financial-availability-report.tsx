"use client";

import { Wallet } from "lucide-react";
import { useSafeSummary } from "@/features/treasury/presentation/use-safe-summary";
import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { ReportExportMenu } from "@/shared/components/report-export-menu";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { ReportExportColumn } from "@/shared/lib/export/report-export";

interface AvailabilityRow {
  source: string;
  balance: number;
}

/**
 * Disponibilidade Financeira — foto do dinheiro disponível agora
 * (Cofre + Caixa Recepção, se aberto). Diferente dos demais
 * relatórios: não filtra por período (é um instantâneo do momento),
 * então o seletor de período da tela não afeta este relatório —
 * composta direto aqui (não é uma feature própria, mesma decisão
 * arquitetural já documentada para a Central de Relatórios).
 */
export function FinancialAvailabilityReport({ title }: { title: string }) {
  const { data: safeSummary, isLoading: isSafeLoading } = useSafeSummary();
  const { data: today, isLoading: isRegisterLoading } = useCashRegisterToday();

  const isLoading = isSafeLoading || isRegisterLoading;

  const safeBalance = safeSummary ? Number(safeSummary.balance) : 0;
  const registerBalance =
    today?.status === "OPEN"
      ? Number(today.openingBalance) +
        Number(today.totalIn ?? 0) -
        Number(today.totalOut ?? 0)
      : 0;

  const rows: AvailabilityRow[] = [
    { source: "Cofre (Tesouraria)", balance: safeBalance },
    { source: "Caixa Recepção", balance: registerBalance },
  ];
  const total = safeBalance + registerBalance;

  const exportColumns: ReportExportColumn<AvailabilityRow>[] = [
    { header: "Fonte", accessor: (row) => row.source },
    { header: "Saldo", accessor: (row) => formatCurrencyBRL(row.balance) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ReportExportMenu
          title={title}
          columns={exportColumns}
          rows={[...rows, { source: "Total", balance: total }]}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.source} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground inline-flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" />
                    {row.source}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrencyBRL(row.balance)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-primary text-right text-lg font-bold tabular-nums">
                  {formatCurrencyBRL(total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
