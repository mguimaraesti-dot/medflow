"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { useCashRegisterDayDetail } from "./use-cash-register-day-detail";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { Field } from "@/shared/components/detail-field";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatDateTimeBR,
} from "@/shared/lib/format";
import type { CashRegisterDayResponseDTO } from "../application/dtos/cash-register-day.response-dto";
import type { SafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";

const SAFE_MOVEMENT_TYPE_LABEL: Record<
  SafeMovementResponseDTO["type"],
  string
> = {
  FUNDING: "Aporte",
  SANGRIA: "Sangria",
  CASH_REGISTER_HANDOFF: "Recolhimento",
  MANUAL_ADJUSTMENT: "Ajuste manual",
};

export function CashRegisterDayDetailDrawer({
  day,
  open,
  onOpenChange,
}: {
  day: CashRegisterDayResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: detail } = useCashRegisterDayDetail(day?.id ?? null);
  const { data: categories } = useCategories();
  const categoryById = new Map(categories?.map((c) => [c.id, c]));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {day ? `Fechamento de ${formatDateOnlyBR(day.date)}` : "Fechamento"}
          </SheetTitle>
        </SheetHeader>

        {day && (
          <div className="space-y-6 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Saldo inicial"
                value={formatCurrencyBRL(day.openingBalance)}
              />
              <Field
                label="Saldo final (contábil)"
                value={
                  day.closingBalance
                    ? formatCurrencyBRL(day.closingBalance)
                    : "—"
                }
              />
              <Field
                label="Dinheiro esperado"
                value={
                  day.expectedCashAmount
                    ? formatCurrencyBRL(day.expectedCashAmount)
                    : "—"
                }
              />
              <Field
                label="Valor contado"
                value={
                  day.countedAmount ? formatCurrencyBRL(day.countedAmount) : "—"
                }
              />
              <Field
                label="Diferença (contado x esperado)"
                value={day.difference ? formatCurrencyBRL(day.difference) : "—"}
              />
              <Field
                label="Valor recebido (handoff)"
                value={
                  day.receivedAmount
                    ? formatCurrencyBRL(day.receivedAmount)
                    : "—"
                }
              />
              <Field
                label="Diferença confirmada"
                value={
                  day.confirmedDifference
                    ? formatCurrencyBRL(day.confirmedDifference)
                    : "—"
                }
              />
            </div>

            {day.closureNote && (
              <Field label="Observação do fechamento" value={day.closureNote} />
            )}
            {day.rejectionReason && (
              <Field
                label="Motivo da última rejeição"
                value={day.rejectionReason}
              />
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Lançamentos do dia</p>
              {!detail || detail.entries.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum lançamento neste dia.
                </p>
              ) : (
                <div className="space-y-1">
                  {detail.entries.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {formatDateTimeBR(entry.occurredAt)} ·{" "}
                        {categoryById.get(entry.categoryId)?.name ??
                          "Sem categoria"}
                      </span>
                      <span
                        className={
                          entry.type === "IN"
                            ? "text-success font-medium"
                            : "text-destructive font-medium"
                        }
                      >
                        {entry.type === "IN" ? "+" : "-"}
                        {formatCurrencyBRL(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Movimentações do Cofre</p>
              {!detail || detail.safeMovements.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma movimentação do Cofre vinculada a este dia.
                </p>
              ) : (
                <div className="space-y-1">
                  {detail.safeMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <Badge variant="outline">
                        {SAFE_MOVEMENT_TYPE_LABEL[movement.type]}
                      </Badge>
                      <span className="font-medium">
                        {formatCurrencyBRL(movement.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
