"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { useSafeMovements } from "./use-safe-movements";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { SafeMovement } from "../domain/safe-movement.entity";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export type SafeMovementTypeFilter = "ALL" | SafeMovement["type"];

const TYPE_BADGE: Record<
  SafeMovement["type"],
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  FUNDING: { label: "Aporte", variant: "outline" },
  SANGRIA: { label: "Sangria", variant: "secondary" },
  CASH_REGISTER_HANDOFF: { label: "Recolhimento", variant: "default" },
  MANUAL_ADJUSTMENT: { label: "Ajuste manual", variant: "outline" },
};

/**
 * `amount` no banco é sempre positivo, exceto em `MANUAL_ADJUSTMENT`
 * (carrega seu próprio sinal) — aqui convertemos pro sinal real de
 * efeito no saldo do Cofre, só para exibição (Coding Standards 18.1: o
 * dado persistido não muda, isso é só uma projeção visual).
 */
function signedAmount(movement: SafeMovementResponseDTO): number {
  if (movement.type === "FUNDING") return -Number(movement.amount);
  return Number(movement.amount);
}

export function SafeMovementsTable({
  type,
  createdAtFrom,
  createdAtTo,
}: {
  type: SafeMovementTypeFilter;
  createdAtFrom?: Date;
  createdAtTo?: Date;
}) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSafeMovements({
    type: type === "ALL" ? undefined : type,
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
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((movement) => {
                  const badge = TYPE_BADGE[movement.type];
                  const amount = signedAmount(movement);

                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTimeBR(movement.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-medium " +
                          (amount < 0 ? "text-destructive" : "text-success")
                        }
                      >
                        {formatCurrencyBRL(amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.reason || "—"}
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
    </>
  );
}
