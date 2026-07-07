"use client";

import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** "Resumo do Dia" — vai no rodapé da Caixa Recepção (Refinamento UX/UI). */
export function DailySummaryCard() {
  const { data: today, isLoading } = useCashRegisterToday();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!today) {
    return null;
  }

  const totalIn = Number(today.totalIn ?? "0");
  const totalOut = Number(today.totalOut ?? "0");
  const expectedBalance = Number(today.openingBalance) + totalIn - totalOut;
  const hasCounted = today.countedAmount !== null;
  const difference = today.difference !== null ? Number(today.difference) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo do Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <SummaryRow
          label="Saldo Inicial"
          value={formatCurrencyBRL(today.openingBalance)}
        />
        <SummaryRow
          label="Entradas"
          value={formatCurrencyBRL(today.totalIn ?? "0")}
        />
        <SummaryRow
          label="Saídas"
          value={formatCurrencyBRL(today.totalOut ?? "0")}
        />
        <SummaryRow
          label="Saldo Esperado"
          value={formatCurrencyBRL(expectedBalance.toFixed(2))}
        />
        <SummaryRow
          label="Saldo Contado"
          value={
            hasCounted ? formatCurrencyBRL(today.countedAmount ?? "0") : "—"
          }
        />
        <SummaryRow
          label="Diferença"
          value={
            hasCounted
              ? `${difference === 0 ? "🟢" : "🔴"} ${formatCurrencyBRL(today.difference ?? "0")}`
              : "—"
          }
        />
        <SummaryRow
          label="Status"
          value={
            today.status === "OPEN"
              ? "🟢 Caixa Aberto"
              : hasCounted
                ? difference === 0
                  ? "🟢 Sem diferença"
                  : "🔴 Diferença encontrada"
                : "🔴 Caixa Fechado"
          }
        />
      </CardContent>
    </Card>
  );
}
