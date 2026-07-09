"use client";

import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useTreasuryDashboardSummary } from "./use-treasury-dashboard-summary";

/**
 * Saldo Inicial é derivado (Saldo Atual − Entradas do período + Saídas do
 * período) em vez de uma nova consulta de "saldo em uma data passada" —
 * evita mais um endpoint só pra este painel secundário.
 */
export function TreasuryPeriodSummary({
  range,
  movementsTotal,
}: {
  range: { from: Date; to: Date };
  movementsTotal: number;
}) {
  const { data } = useTreasuryDashboardSummary(range);

  const periodIn = Number(data?.periodIn ?? 0);
  const periodOut = Number(data?.periodOut ?? 0);
  const closingBalance = Number(data?.balance ?? 0);
  const openingBalance = closingBalance - periodIn + periodOut;

  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: "Saldo Inicial", value: formatCurrencyBRL(openingBalance) },
    { label: "Entradas", value: `+ ${formatCurrencyBRL(periodIn)}` },
    { label: "Saídas", value: `- ${formatCurrencyBRL(periodOut)}` },
    {
      label: "Saldo Final",
      value: formatCurrencyBRL(closingBalance),
      emphasis: true,
    },
    { label: "Movimentações", value: String(movementsTotal) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Resumo do Período
        </CardTitle>
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
                row.emphasis ? "font-semibold tabular-nums" : "tabular-nums"
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
