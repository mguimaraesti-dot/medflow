"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Landmark } from "lucide-react";
import { useSafeMovements } from "./use-safe-movements";
import { SafeMovementDetailDrawer } from "./safe-movement-detail-drawer";
import { ConfirmSafeMovementDialog } from "./confirm-safe-movement-dialog";
import { CancelSafeMovementDialog } from "./cancel-safe-movement-dialog";
import {
  describeMovement,
  isMovementIn,
  originLabel,
  categoryLabel,
  movementDirection,
  statusLabel,
} from "./safe-movement-display";
import { formatDateTimeBR, formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import type { SafeMovementsFilter } from "./use-safe-movements";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

const STATUS_BADGE_CLASSES: Record<SafeMovementResponseDTO["status"], string> =
  {
    PENDING:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500",
    CONFIRMED:
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
    CANCELLED:
      "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  };

const DIRECTION_BORDER_CLASS: Record<string, string> = {
  IN: "border-l-4 border-l-green-500",
  OUT: "border-l-4 border-l-red-500",
  ADJUSTMENT: "border-l-4 border-l-blue-500",
};

/**
 * Lista em cards das movimentações do Cofre no mobile — substitui a
 * `SafeMovementsTable` abaixo de `lg` (ver `useMediaQuery` em
 * `treasury-screen.tsx`). Pendente ganha destaque (fundo âmbar +
 * Confirmar/Cancelar direto no card), já que é a única movimentação
 * que pede ação do gerente.
 */
export function SafeMovementCards({
  filter,
  canConfirm,
}: {
  filter: Omit<SafeMovementsFilter, "page" | "pageSize">;
  canConfirm: boolean;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SafeMovementResponseDTO | null>(
    null,
  );
  const [confirmTarget, setConfirmTarget] =
    useState<SafeMovementResponseDTO | null>(null);
  const [cancelTarget, setCancelTarget] =
    useState<SafeMovementResponseDTO | null>(null);

  const { data, isLoading } = useSafeMovements({
    ...filter,
    page,
    pageSize: 20,
  });

  return (
    <>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <EmptyState
          icon={Landmark}
          title="Nenhuma movimentação encontrada."
          description="Ajuste os filtros ou a busca para ver outras movimentações do Cofre."
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {data.items.map((movement) => {
              const isIn = isMovementIn(movement);
              const direction = movementDirection(movement);
              const isPending = movement.status === "PENDING";

              return (
                <div
                  key={movement.id}
                  className={cn(
                    "bg-card cursor-pointer rounded-xl border p-3.5 shadow-sm",
                    DIRECTION_BORDER_CLASS[direction],
                    isPending && "border-amber-500/35 bg-amber-500/[0.06]",
                  )}
                  onClick={() => setSelected(movement)}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatDateTimeBR(movement.createdAt)}
                    </p>
                    <p
                      className={cn(
                        "text-[16.5px] font-semibold tabular-nums",
                        isIn ? "text-success" : "text-destructive",
                      )}
                    >
                      {isIn ? "+" : "-"}
                      {formatCurrencyBRL(movement.amount.replace("-", ""))}
                    </p>
                  </div>

                  <p className="mb-1 text-[15px] font-medium">
                    {describeMovement(movement)}
                  </p>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                    <span>{originLabel(movement)}</span>
                    <span className="opacity-40">·</span>
                    <span>{categoryLabel(movement)}</span>
                    <span className="opacity-40">·</span>
                    <Badge
                      variant="outline"
                      className={STATUS_BADGE_CLASSES[movement.status]}
                    >
                      {statusLabel(movement.status)}
                    </Badge>
                    <span className="opacity-40">·</span>
                    <span>{movement.performedByUserName.split(" ")[0]}</span>
                  </div>

                  {canConfirm && isPending && (
                    <div
                      className="mt-3 flex gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => setConfirmTarget(movement)}
                      >
                        Confirmar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/45 text-destructive flex-1"
                        onClick={() => setCancelTarget(movement)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-muted-foreground">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <SafeMovementDetailDrawer
        movement={selected}
        canConfirm={canConfirm}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
      <ConfirmSafeMovementDialog
        movement={confirmTarget}
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      />
      <CancelSafeMovementDialog
        movement={cancelTarget}
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />
    </>
  );
}
