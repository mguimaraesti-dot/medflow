"use client";

import { useState } from "react";
import { useCashFlowEntries } from "./use-cash-flow-entries";
import { ReverseEntryDialog } from "./reverse-entry-dialog";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function CashFlowEntriesTable({
  cashRegisterDayId,
  canReverse,
}: {
  cashRegisterDayId: string | undefined;
  canReverse: boolean;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCashFlowEntries({ cashRegisterDayId, page });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançamentos do dia</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        )}

        {!isLoading && !cashRegisterDayId && (
          <p className="text-muted-foreground text-sm">
            Nenhum caixa aberto hoje.
          </p>
        )}

        {!isLoading && cashRegisterDayId && data && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Estorno</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {formatDateTimeBR(entry.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.type === "IN" ? "default" : "destructive"
                          }
                        >
                          {entry.type === "IN" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrencyBRL(entry.amount)}</TableCell>
                      <TableCell>{entry.description ?? "—"}</TableCell>
                      <TableCell>
                        {entry.isReversed && (
                          <Badge variant="secondary">Estornado</Badge>
                        )}
                        {entry.reversalOfEntryId && (
                          <Badge variant="outline">Estorno</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canReverse &&
                          !entry.isReversed &&
                          !entry.reversalOfEntryId && (
                            <ReverseEntryDialog entryId={entry.id} />
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.items.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground text-center"
                      >
                        Nenhum lançamento ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Página {data.page} de {data.totalPages} · {data.total}{" "}
                lançamento(s)
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
      </CardContent>
    </Card>
  );
}
