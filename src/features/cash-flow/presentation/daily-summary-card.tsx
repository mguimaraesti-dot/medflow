"use client";

import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "text-xl font-bold tracking-tight",
          tone === "positive" && "text-green-600 dark:text-green-500",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** "Resumo Financeiro" — vai no rodapé da Caixa Recepção (Refinamento UX/UI). */
export function DailySummaryCard() {
  const { data: today, isLoading } = useCashRegisterToday();

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
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
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryStat
          label="Saldo Inicial"
          value={formatCurrencyBRL(today.openingBalance)}
        />
        <SummaryStat
          label="Entradas"
          value={formatCurrencyBRL(today.totalIn ?? "0")}
          tone="positive"
        />
        <SummaryStat
          label="Saídas"
          value={formatCurrencyBRL(today.totalOut ?? "0")}
          tone="negative"
        />
        <SummaryStat
          label="Saldo Esperado"
          value={formatCurrencyBRL(expectedBalance.toFixed(2))}
        />
        <SummaryStat
          label="Saldo Contado"
          value={
            hasCounted ? formatCurrencyBRL(today.countedAmount ?? "0") : "—"
          }
        />
        <SummaryStat
          label="Diferença"
          value={hasCounted ? formatCurrencyBRL(today.difference ?? "0") : "—"}
          tone={
            hasCounted
              ? difference === 0
                ? "positive"
                : "negative"
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
