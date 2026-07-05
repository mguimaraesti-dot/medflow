"use client";

import { useState } from "react";
import { CalendarDays, Eye } from "lucide-react";
import { useCashRegisterDays } from "./use-cash-register-days";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
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
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";

const STATUS_BADGE: Record<
  CashRegisterDayResponseDTO["status"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  OPEN: { label: "Aberto", variant: "default" },
  PENDING_CONFERENCE: { label: "Aguardando conferência", variant: "outline" },
  CLOSED: { label: "Fechado", variant: "secondary" },
};

export function CashRegisterHistoryTable({
  dateFrom,
  dateTo,
  onView,
}: {
  dateFrom?: Date;
  dateTo?: Date;
  onView: (day: CashRegisterDayResponseDTO) => void;
}) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCashRegisterDays({ dateFrom, dateTo, page });

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
          icon={CalendarDays}
          title="Nenhum fechamento encontrado."
          description="O histórico de abertura/fechamento de caixa aparece aqui."
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Saldo final</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((day) => {
                  const badge = STATUS_BADGE[day.status];
                  const difference =
                    day.difference !== null ? Number(day.difference) : null;

                  return (
                    <TableRow
                      key={day.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onView(day)}
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDateOnlyBR(day.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyBRL(day.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.closingBalance
                          ? formatCurrencyBRL(day.closingBalance)
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-medium " +
                          (difference === null
                            ? "text-muted-foreground"
                            : difference < 0
                              ? "text-destructive"
                              : "text-success")
                        }
                      >
                        {difference !== null
                          ? formatCurrencyBRL(difference)
                          : "—"}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(day)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Visualizar</span>
                        </Button>
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
              fechamento(s)
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
