"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
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
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
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

function firstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export function SafeMovementsTable({
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
    pageSize: 12,
  });

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

  const columns = (
    <TableRow className="hover:bg-transparent">
      <TableHead>Data/Hora</TableHead>
      <TableHead>Origem</TableHead>
      <TableHead>Tipo</TableHead>
      <TableHead>Categoria</TableHead>
      <TableHead>Descrição</TableHead>
      <TableHead className="text-right">Valor</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Responsável</TableHead>
      {canConfirm && <TableHead className="text-right">Ações</TableHead>}
    </TableRow>
  );

  function renderRow(movement: SafeMovementResponseDTO) {
    const isIn = isMovementIn(movement);
    const direction = movementDirection(movement);

    return (
      <TableRow
        key={movement.id}
        className="hover:bg-muted/50 cursor-pointer transition-shadow hover:shadow-[inset_3px_0_0_0_var(--primary)]"
        onClick={() => setSelected(movement)}
      >
        <TableCell className="text-muted-foreground">
          {formatDateTimeBR(movement.createdAt)}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {originLabel(movement)}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn(
              direction === "IN" &&
                "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
              direction === "OUT" &&
                "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
              direction === "ADJUSTMENT" &&
                "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
            )}
          >
            {direction === "IN"
              ? "Entrada"
              : direction === "OUT"
                ? "Saída"
                : "Ajuste"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {categoryLabel(movement)}
        </TableCell>
        <TableCell className="text-muted-foreground max-w-[220px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="cursor-help truncate">
                {describeMovement(movement)}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {describeMovement(movement)}
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell
          className={
            "text-right font-medium tabular-nums " +
            (isIn ? "text-success" : "text-destructive")
          }
        >
          {isIn ? "+" : "-"}
          {formatCurrencyBRL(movement.amount.replace("-", ""))}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={STATUS_BADGE_CLASSES[movement.status]}
          >
            {statusLabel(movement.status)}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                {firstName(movement.performedByUserName)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{movement.performedByUserName}</TooltipContent>
          </Tooltip>
          {movement.confirmedByUserName && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-success cursor-help text-xs">
                  ✓ {firstName(movement.confirmedByUserName)}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                Confirmado por {movement.confirmedByUserName} em{" "}
                {formatDateTimeBR(movement.confirmedAt!)}
              </TooltipContent>
            </Tooltip>
          )}
        </TableCell>
        {canConfirm && (
          <TableCell
            className="text-right"
            onClick={(event) => event.stopPropagation()}
          >
            {movement.status === "PENDING" && (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => setConfirmTarget(movement)}
                >
                  Confirmar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCancelTarget(movement)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </TableCell>
        )}
      </TableRow>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>{columns}</TableHeader>
              <TableBody>
                {visibleItems.map((movement) => renderRow(movement))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Página {data.page} de {data.totalPages} · {data.total}{" "}
              movimentação(ões)
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
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
