import Link from "next/link";
import { formatCurrencyBRL, formatTimeBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import {
  TONE_ICON_CLASSES,
  TONE_VALUE_CLASSES,
  eventIcon,
} from "./dashboard-timeline-card";
import { Card, CardContent } from "@/shared/ui/card";
import type { DashboardTimelineEventResponseDTO } from "../application/dtos/dashboard-overview.response-dto";

/**
 * "Últimas movimentações" — seção 6 do Dashboard mobile. Mesmos
 * `overview.timeline` e mesmo mapeamento de ícone/tom de
 * `DashboardTimelineCard` (desktop) — só o layout muda: no desktop o
 * nome/descrição usa `truncate` (corta em telas estreitas); aqui o
 * valor e a hora vão pra direita numa coluna própria, deixando a
 * largura toda pro nome (que o usuário usa pra conferir o dia).
 */
export function DashboardMobileTimeline({
  events,
}: {
  events: DashboardTimelineEventResponseDTO[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Últimas movimentações
        </p>
        <Link href="/cash-flow" className="text-primary text-xs font-semibold">
          Ver todas
        </Link>
      </div>
      <Card className="py-1">
        <CardContent className="divide-y px-3">
          {events.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Nenhuma movimentação hoje ainda.
            </p>
          ) : (
            events.map((event) => {
              const Icon = eventIcon(event);
              return (
                <div key={event.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      TONE_ICON_CLASSES[event.tone],
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{event.title}</p>
                    {event.subtitle && (
                      <p className="text-muted-foreground text-xs">
                        {event.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {event.amount && (
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          TONE_VALUE_CLASSES[event.tone],
                        )}
                      >
                        {Number(event.amount) < 0 ? "- " : ""}
                        {formatCurrencyBRL(Math.abs(Number(event.amount)))}
                      </p>
                    )}
                    <p className="text-muted-foreground text-[11px]">
                      {formatTimeBR(event.occurredAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
