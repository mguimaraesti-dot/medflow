import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  Lock,
  Unlock,
  type LucideIcon,
} from "lucide-react";
import { formatCurrencyBRL, formatTimeBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { DashboardTimelineEventResponseDTO } from "../application/dtos/dashboard-overview.response-dto";
import type { DashboardTimelineTone } from "../domain/dashboard-overview.entity";

const TONE_ICON_CLASSES: Record<DashboardTimelineTone, string> = {
  green: "bg-green-500/10 text-green-600 dark:text-green-500",
  red: "bg-red-500/10 text-red-600 dark:text-red-500",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  yellow: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  neutral: "bg-muted text-muted-foreground",
};

const TONE_VALUE_CLASSES: Record<DashboardTimelineTone, string> = {
  green: "text-green-600 dark:text-green-500",
  red: "text-red-600 dark:text-red-500",
  blue: "text-blue-600 dark:text-blue-400",
  yellow: "text-amber-600 dark:text-amber-500",
  neutral: "text-foreground",
};

function eventIcon(event: DashboardTimelineEventResponseDTO): LucideIcon {
  if (event.title.includes("fechado")) return Lock;
  if (event.title.includes("aberto") || event.title.includes("reaberto"))
    return Unlock;
  switch (event.tone) {
    case "green":
      return ArrowDownToLine;
    case "red":
      return ArrowUpFromLine;
    case "blue":
      return Landmark;
    case "yellow":
      return AlertTriangle;
    default:
      return Landmark;
  }
}

export function DashboardTimelineCard({
  events,
}: {
  events: DashboardTimelineEventResponseDTO[];
}) {
  return (
    <Card className="flex flex-col gap-4 py-4">
      <CardHeader className="flex-row items-center justify-between px-4">
        <CardTitle className="text-sm font-semibold">
          Últimas Movimentações
        </CardTitle>
        <Link
          href="/cash-flow"
          className="text-primary text-xs font-semibold hover:underline"
        >
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1 px-4">
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma movimentação hoje ainda.
          </p>
        ) : (
          events.map((event) => {
            const Icon = eventIcon(event);
            return (
              <div key={event.id} className="flex items-start gap-3 py-1.5">
                <span className="text-muted-foreground w-11 shrink-0 pt-1 text-xs tabular-nums">
                  {formatTimeBR(event.occurredAt)}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    TONE_ICON_CLASSES[event.tone],
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pt-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {event.title}
                    </p>
                    {event.subtitle && (
                      <p className="text-muted-foreground truncate text-xs">
                        {event.subtitle}
                      </p>
                    )}
                  </div>
                  {event.amount && (
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        TONE_VALUE_CLASSES[event.tone],
                      )}
                    >
                      {Number(event.amount) < 0 ? "- " : ""}
                      {formatCurrencyBRL(Math.abs(Number(event.amount)))}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
