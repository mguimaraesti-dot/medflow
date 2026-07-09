"use client";

import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { useSafeMovements } from "./use-safe-movements";
import { useSafeSummary } from "./use-safe-summary";
import { SafeMovementDetailDrawer } from "./safe-movement-detail-drawer";
import {
  categoryLabel,
  describeMovement,
  isMovementIn,
  movementDirection,
  originLabel,
  signedAmount,
  statusLabel,
  type MovementDirection,
} from "./safe-movement-display";
import { formatCurrencyBRL, formatDateOnlyLocalBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { ReportExportMenu } from "@/shared/components/report-export-menu";
import { ReportRowActions } from "@/shared/components/report-row-actions";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { ReportExportColumn } from "@/shared/lib/export/report-export";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";
import type { SafeMovementType } from "../domain/safe-movement.entity";

/**
 * Tabela genérica de movimentações do Cofre — cobre 4 itens do
 * catálogo (Recebimentos/Ajustes/Retiradas/Saldo do Cofre), cada um
 * filtrando `types` (e, quando o tipo sozinho não basta —
 * `MANUAL_ADJUSTMENT` cobre tanto ajuste quanto retirada manual —
 * também `directionFilter`, usando o mesmo `movementDirection()` já
 * usado na Tesouraria).
 */
export function SafeMovementsReportTable({
  title,
  types,
  directionFilter,
  dateFrom,
  dateTo,
  showBalance,
}: {
  title: string;
  types?: SafeMovementType[];
  directionFilter?: MovementDirection;
  dateFrom: Date;
  dateTo: Date;
  showBalance?: boolean;
}) {
  const [viewingMovement, setViewingMovement] =
    useState<SafeMovementResponseDTO | null>(null);

  const { data, isLoading } = useSafeMovements({
    types,
    createdAtFrom: dateFrom,
    createdAtTo: dateTo,
    pageSize: 500,
  });
  const { data: safeSummary } = useSafeSummary({
    enabled: Boolean(showBalance),
  });

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (!directionFilter) return all;
    return all.filter(
      (movement) => movementDirection(movement) === directionFilter,
    );
  }, [data?.items, directionFilter]);

  const columns: ReportExportColumn<SafeMovementResponseDTO>[] = [
    {
      header: "Data",
      accessor: (movement) => formatDateOnlyLocalBR(movement.createdAt),
    },
    { header: "Descrição", accessor: describeMovement },
    { header: "Origem", accessor: originLabel },
    { header: "Categoria", accessor: categoryLabel },
    {
      header: "Valor",
      accessor: (movement) =>
        `${isMovementIn(movement) ? "+" : "-"}${formatCurrencyBRL(Math.abs(signedAmount(movement)))}`,
    },
    { header: "Status", accessor: (movement) => statusLabel(movement.status) },
  ];

  return (
    <div className="space-y-4">
      {showBalance && (
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Saldo Atual do Cofre</p>
          <p className="text-primary text-xl font-bold tabular-nums">
            {safeSummary ? formatCurrencyBRL(safeSummary.balance) : "—"}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <ReportExportMenu title={title} columns={columns} rows={items} />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={Landmark}
          title="Nenhuma movimentação encontrada."
          description="Ajuste o período selecionado."
        />
      )}

      {!isLoading && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((movement) => {
                const isIn = isMovementIn(movement);
                return (
                  <TableRow key={movement.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyLocalBR(movement.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {describeMovement(movement)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {originLabel(movement)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {categoryLabel(movement)}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right font-semibold tabular-nums " +
                        (isIn
                          ? "text-green-600 dark:text-green-500"
                          : "text-destructive")
                      }
                    >
                      {isIn ? "+" : "-"}
                      {formatCurrencyBRL(Math.abs(signedAmount(movement)))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {statusLabel(movement.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ReportRowActions
                        title={title}
                        columns={columns}
                        row={movement}
                        onView={() => setViewingMovement(movement)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SafeMovementDetailDrawer
        movement={viewingMovement}
        canConfirm={false}
        open={viewingMovement !== null}
        onOpenChange={(open) => !open && setViewingMovement(null)}
      />
    </div>
  );
}
