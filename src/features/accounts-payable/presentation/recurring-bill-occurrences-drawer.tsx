"use client";

import { Eye, Repeat } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { STATUS_META, formatCompetencia } from "./accounts-payable-helpers";
import { useRecurringBillOccurrences } from "./use-recurring-bill-occurrences";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/** Drawer secundário — lista todas as ocorrências (irmãs) de uma recorrência, sem sair da Conta a Pagar. */
export function RecurringBillOccurrencesDrawer({
  recurringBillId,
  currentPayableId,
  open,
  onOpenChange,
  onOpenAccount,
}: {
  recurringBillId: string;
  currentPayableId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAccount: (payable: AccountsPayableResponseDTO) => void;
}) {
  const { data: result } = useRecurringBillOccurrences(recurringBillId);
  const occurrences = result?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            Ocorrências da recorrência
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {occurrences.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Nenhuma ocorrência encontrada."
              description="As contas geradas por esta recorrência aparecem aqui."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occurrences.map((occurrence) => {
                  const badge = STATUS_META[occurrence.displayStatus];
                  const isCurrent = occurrence.id === currentPayableId;
                  return (
                    <TableRow
                      key={occurrence.id}
                      className={cn(isCurrent && "bg-primary/5")}
                    >
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          {formatCompetencia(occurrence.dueDate)}
                          {isCurrent && (
                            <Badge
                              variant="outline"
                              className="text-primary border-primary/30"
                            >
                              Atual
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatDateOnlyBR(occurrence.dueDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyBRL(occurrence.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={badge.badgeClassName}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenAccount(occurrence)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Abrir Conta
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
