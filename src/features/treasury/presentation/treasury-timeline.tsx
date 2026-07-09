"use client";

import { formatCurrencyBRL, formatTimeBR } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { useSafeMovements } from "./use-safe-movements";
import {
  describeMovement,
  isMovementIn,
  statusLabel,
} from "./safe-movement-display";
import { computeQuickPeriodRange } from "./treasury-filters-bar";

const STATUS_BADGE_CLASSES = {
  PENDING:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  CONFIRMED:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
  CANCELLED:
    "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
} as const;

/** Sempre "hoje", independente dos filtros ativos na tabela — igual ao mockup ("Linha do Tempo - Hoje"). */
export function TreasuryTimeline() {
  const range = computeQuickPeriodRange("TODAY");
  const { data } = useSafeMovements({
    createdAtFrom: range.from,
    createdAtTo: range.to,
    pageSize: 8,
  });

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Linha do Tempo — Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma movimentação hoje ainda.
          </p>
        ) : (
          <ol className="space-y-4">
            {items.map((movement) => {
              const isIn = isMovementIn(movement);
              return (
                <li key={movement.id} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground w-12 shrink-0 tabular-nums">
                    {formatTimeBR(movement.createdAt)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium">
                      {describeMovement(movement)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          isIn ? "text-success" : "text-destructive",
                        )}
                      >
                        {isIn ? "+" : "-"}
                        {formatCurrencyBRL(movement.amount.replace("-", ""))}
                      </span>
                      <Badge
                        variant="outline"
                        className={STATUS_BADGE_CLASSES[movement.status]}
                      >
                        {statusLabel(movement.status)}
                      </Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
