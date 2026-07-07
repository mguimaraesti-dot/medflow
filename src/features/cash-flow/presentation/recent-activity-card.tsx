import { formatTimeBR } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";
import type { CashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";

const MAX_EVENTS = 10;

interface ActivityEvent {
  time: string | Date;
  label: string;
}

/**
 * Substitui a antiga "Linha do Tempo" (que listava todo lançamento, já
 * coberto pela Tabela de Lançamentos). Mostra só eventos de estado do
 * caixa e estornos — sem Sangria/Suprimento, que são conceitos da
 * Tesouraria (Safe/SafeMovement), fora do escopo desta tela operacional
 * (Refinamento UX/UI Caixa Recepção).
 */
export function RecentActivityCard({
  entries,
  cashRegisterDay,
}: {
  entries: CashFlowEntryResponseDTO[];
  cashRegisterDay: CashRegisterDayResponseDTO | null | undefined;
}) {
  const events: ActivityEvent[] = [];

  if (cashRegisterDay) {
    events.push({ time: cashRegisterDay.openedAt, label: "Caixa Aberto" });
    if (cashRegisterDay.reopenedAt) {
      events.push({
        time: cashRegisterDay.reopenedAt,
        label: "Caixa Reaberto",
      });
    }
    if (cashRegisterDay.closedAt) {
      events.push({ time: cashRegisterDay.closedAt, label: "Caixa Fechado" });
    }
  }

  for (const entry of entries) {
    if (entry.isReversed || entry.reversalOfEntryId) {
      events.push({ time: entry.occurredAt, label: "Estorno" });
    }
  }

  events.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  const recentEvents = events.slice(0, MAX_EVENTS);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {recentEvents.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma atividade registrada ainda hoje.
          </p>
        )}
        <ol className="space-y-3">
          {recentEvents.map((event, index) => (
            <li key={index} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-12 shrink-0 tabular-nums">
                {formatTimeBR(event.time)}
              </span>
              <span className="bg-border h-1.5 w-1.5 shrink-0 rounded-full" />
              <span className="flex-1">{event.label}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
