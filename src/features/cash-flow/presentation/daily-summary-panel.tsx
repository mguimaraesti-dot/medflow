"use client";

import { useCashFlowEntries } from "./use-cash-flow-entries";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";

/**
 * Resumo do Dia — só os números já calculados em outros pontos da tela
 * (`cash-balance-header.tsx`/`close-register-dialog.tsx`), sem endpoint
 * novo. `useCashFlowEntries` usa a mesma chave de query já buscada pela
 * tabela de lançamentos, então o React Query reaproveita o cache.
 */
export function DailySummaryPanel({
  today,
}: {
  today: CashRegisterDayResponseDTO;
}) {
  const { data } = useCashFlowEntries(
    { cashRegisterDayId: today.id, pageSize: 100 },
    { enabled: Boolean(today.id) },
  );

  const openingBalance = Number(today.openingBalance);
  const cashIn = Number(today.cashIn ?? 0);
  const totalIn = Number(today.totalIn ?? 0);
  const totalOut = Number(today.totalOut ?? 0);
  const pixIn = totalIn - cashIn;
  const currentBalance = openingBalance + totalIn - totalOut;

  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: "Saldo Inicial", value: formatCurrencyBRL(openingBalance) },
    { label: "Entradas em Dinheiro", value: formatCurrencyBRL(cashIn) },
    { label: "Entradas via PIX", value: formatCurrencyBRL(pixIn) },
    { label: "Saídas em Dinheiro", value: `-${formatCurrencyBRL(totalOut)}` },
    {
      label: "Saldo Atual",
      value: formatCurrencyBRL(currentBalance),
      emphasis: true,
    },
    { label: "Total de Lançamentos", value: String(data?.total ?? 0) },
  ];

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Resumo do Dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={
                row.emphasis
                  ? "text-primary text-lg font-bold tabular-nums"
                  : "font-medium tabular-nums"
              }
            >
              {row.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
