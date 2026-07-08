"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { useSafeMovements } from "./use-safe-movements";
import { SafeMovementDetailDrawer } from "./safe-movement-detail-drawer";
import { describeMovement, isMovementIn } from "./safe-movement-display";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

function firstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export function SafeMovementsTable({
  createdAtFrom,
  createdAtTo,
}: {
  createdAtFrom?: Date;
  createdAtTo?: Date;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SafeMovementResponseDTO | null>(
    null,
  );

  const { data, isLoading } = useSafeMovements({
    createdAtFrom,
    createdAtTo,
    page,
  });

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
          description="As movimentações do Cofre aparecem aqui."
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((movement) => {
                  const isIn = isMovementIn(movement);

                  return (
                    <TableRow
                      key={movement.id}
                      className="hover:bg-muted/50 cursor-pointer transition-shadow hover:shadow-[inset_3px_0_0_0_var(--primary)]"
                      onClick={() => setSelected(movement)}
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeBR(movement.createdAt)}
                      </TableCell>
                      <TableCell
                        className={
                          isIn
                            ? "text-success font-medium"
                            : "text-destructive font-medium"
                        }
                      >
                        {isIn ? "Entrada" : "Saída"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {describeMovement(movement)}
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
                      <TableCell className="text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {firstName(movement.performedByUserName)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {movement.performedByUserName}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
