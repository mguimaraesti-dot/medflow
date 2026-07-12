"use client";

import { useCashFlowEntries } from "./use-cash-flow-entries";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "primary";
}) {
  return (
    <div className="bg-muted/30 flex flex-col justify-center rounded-xl border px-4 py-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={cn(
          "font-semibold tabular-nums",
          tone === "primary" ? "text-primary text-2xl" : "text-xl",
          tone === "positive" && "text-green-600 dark:text-green-500",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Resumo do Dia — só os números já calculados em outros pontos da tela
 * (`cash-balance-header.tsx`/`close-register-dialog.tsx`), sem endpoint
 * novo. `useCashFlowEntries` usa a mesma chave de query já buscada pela
 * tabela de lançamentos, então o React Query reaproveita o cache.
 *
 * Continua visível com o caixa fechado (ou sem nenhum caixa aberto hoje)
 * — nesse estado os valores aparecem zerados, nunca o resumo de um dia
 * já encerrado. `h-full` + `justify-between` (em vez de `flex-1` por
 * card) distribui o espaço vertical sobrando nos gaps entre os 5
 * mini-cards, que mantêm altura natural — mesma técnica do protótipo
 * de referência (Ajuste de layout Novo Lançamento/Resumo do Dia).
 */
export function DailySummaryPanel({
  today,
}: {
  today: CashRegisterDayResponseDTO | null | undefined;
}) {
  const isOpen = today?.status === "OPEN";
  const { data } = useCashFlowEntries(
    { cashRegisterDayId: today?.id, pageSize: 100 },
    { enabled: isOpen && Boolean(today?.id) },
  );

  const openingBalance = isOpen ? Number(today.openingBalance) : 0;
  const totalIn = isOpen ? Number(today.totalIn ?? 0) : 0;
  const totalOut = isOpen ? Number(today.totalOut ?? 0) : 0;
  const currentBalance = openingBalance + totalIn - totalOut;
  const entriesCount = data?.total ?? 0;

  return (
    <Card className="flex h-full flex-col rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg whitespace-nowrap">
          Resumo do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between">
        <MetricTile
          label="Saldo Inicial"
          value={formatCurrencyBRL(openingBalance)}
        />
        <MetricTile
          label="Saldo Atual"
          value={formatCurrencyBRL(currentBalance)}
          tone="primary"
        />
        <MetricTile
          label="Entradas"
          value={formatCurrencyBRL(totalIn)}
          tone="positive"
        />
        <MetricTile
          label="Saídas"
          value={`-${formatCurrencyBRL(totalOut)}`}
          tone="negative"
        />
        <MetricTile label="Lançamentos Hoje" value={String(entriesCount)} />
      </CardContent>
    </Card>
  );
}
