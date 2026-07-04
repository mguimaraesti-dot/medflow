import { cn } from "@/shared/lib/utils";
import { formatCurrencyBRL, formatTimeBR } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";
import type { CashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";

interface TimelineEvent {
  // O DTO tipa como `Date`, mas depois do round-trip JSON o valor real
  // já chega como string ISO — `formatTimeBR` aceita os dois formatos.
  time: string | Date;
  label: string;
  detail?: string;
  tone?: "positive" | "negative";
}

/**
 * Auditoria rápida do dia: abertura → lançamentos → fechamento, em
 * ordem cronológica — reaproveita os dados já buscados pelo card de
 * status e pela tabela, sem endpoint novo.
 */
export function CashFlowTimeline({
  entries,
  cashRegisterDay,
}: {
  entries: CashFlowEntryResponseDTO[];
  cashRegisterDay: CashRegisterDayResponseDTO | null | undefined;
}) {
  const events: TimelineEvent[] = [];

  if (cashRegisterDay) {
    events.push({
      time: cashRegisterDay.openedAt,
      label: "Caixa aberto",
      detail: formatCurrencyBRL(cashRegisterDay.openingBalance),
    });
    if (cashRegisterDay.closedAt) {
      events.push({
        time: cashRegisterDay.closedAt,
        label: "Caixa fechado",
        detail: formatCurrencyBRL(cashRegisterDay.closingBalance ?? "0"),
      });
    }
  }

  for (const entry of entries) {
    events.push({
      time: entry.occurredAt,
      label: entry.description || (entry.type === "IN" ? "Entrada" : "Saída"),
      detail: `${entry.type === "IN" ? "+" : "-"}${formatCurrencyBRL(entry.amount)}`,
      tone: entry.type === "IN" ? "positive" : "negative",
    });
  }

  events.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhum evento registrado ainda hoje.
          </p>
        )}
        <ol className="space-y-3">
          {events.map((event, index) => (
            <li key={index} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-12 shrink-0 tabular-nums">
                {formatTimeBR(event.time)}
              </span>
              <span className="bg-border h-1.5 w-1.5 shrink-0 rounded-full" />
              <span className="flex-1 truncate">{event.label}</span>
              {event.detail && (
                <span
                  className={cn(
                    "shrink-0 font-medium",
                    event.tone === "positive" &&
                      "text-green-600 dark:text-green-500",
                    event.tone === "negative" && "text-destructive",
                  )}
                >
                  {event.detail}
                </span>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
