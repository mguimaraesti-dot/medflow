"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Landmark } from "lucide-react";
import { useSafeMovements } from "./use-safe-movements";
import { SafeMovementDetailDrawer } from "./safe-movement-detail-drawer";
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
 * `treasury-screen.tsx`). Nunca mostra `PENDING`: essas ficam sempre
 * na seção "Aguardando confirmação" (`pending-handoffs-section.tsx`,
 * acima da linha de ações rápidas) e são excluídas daqui via
 * `alwaysPendingIds` — é lá que vivem o destaque âmbar e os botões de
 * Confirmar/Cancelar.
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

  // Reset centralizado: qualquer critério de filtragem que mude aqui
  // volta a lista para a página 1 — único ponto de reset, em vez de
  // espalhar `setPage(1)` em cada filtro (mesmo bug já corrigido em
  // Contas a Pagar). Datas usam `.getTime()` e `types` usa `.join(",")`
  // em vez dos objetos/array em si, porque `filter` é recriado a cada
  // render do componente pai — a referência muda mesmo quando o valor
  // não muda, e usá-los direto disparava o reset à toa.
  const typesKey = filter.types?.join(",");
  const createdAtFromMs = filter.createdAtFrom?.getTime();
  const createdAtToMs = filter.createdAtTo?.getTime();
  useEffect(() => {
    setPage(1);
  }, [typesKey, filter.status, filter.search, createdAtFromMs, createdAtToMs]);

  const { data, isLoading } = useSafeMovements({
    ...filter,
    page,
    pageSize: 20,
  });

  /**
   * Pendências aparecem sempre, fora do período filtrado (AJUSTE 2) —
   * mesmo universo (organização inteira, status PENDING, sem outro
   * filtro) do KPI "Pendentes de Confirmação" no cabeçalho, pra garantir
   * que os dois números batam mesmo com tipo/status/busca aplicados na
   * lista abaixo.
   */
  const { data: pendingData } = useSafeMovements({
    status: "PENDING",
    page: 1,
    pageSize: 200,
  });
  const alwaysPendingIds = new Set(
    (pendingData?.items ?? []).map((movement) => movement.id),
  );
  const visibleItems = (data?.items ?? []).filter(
    (movement) => !alwaysPendingIds.has(movement.id),
  );

  function renderCard(movement: SafeMovementResponseDTO) {
    const isIn = isMovementIn(movement);
    const direction = movementDirection(movement);

    return (
      <div
        key={movement.id}
        className={cn(
          "bg-card cursor-pointer rounded-xl border p-3.5 shadow-sm",
          DIRECTION_BORDER_CLASS[direction],
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
          {movement.confirmedByUserName && (
            <>
              <span className="opacity-40">·</span>
              <span className="text-success">
                ✓ {movement.confirmedByUserName.split(" ")[0]}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

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

      {!isLoading && data && visibleItems.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {visibleItems.map((movement) => renderCard(movement))}
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
    </>
  );
}
