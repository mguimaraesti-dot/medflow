"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/components/detail-field";
import { ReverseEntryDialog } from "./reverse-entry-dialog";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { usePaymentMethods } from "@/features/payment-methods/presentation/use-payment-methods";
import { getPaymentMethodIcon } from "@/shared/lib/lucide-icon-map";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";

export function CashFlowEntryDetailDrawer({
  entry,
  open,
  onOpenChange,
  canReverse,
}: {
  entry: CashFlowEntryResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canReverse: boolean;
}) {
  const [reversing, setReversing] = useState(false);
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();

  const category = categories?.find((c) => c.id === entry?.categoryId);
  const paymentMethod = paymentMethods?.find(
    (m) => m.id === entry?.paymentMethodId,
  );
  const PaymentMethodIcon = getPaymentMethodIcon(paymentMethod?.name ?? "");
  const isIn = entry?.type === "IN";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalhe do Lançamento</SheetTitle>
          </SheetHeader>

          {entry && (
            <div className="space-y-6 px-4 pb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={isIn ? "default" : "destructive"}>
                  {isIn ? "Entrada" : "Saída"}
                </Badge>
                {entry.isReversed && (
                  <Badge variant="secondary">Estornado</Badge>
                )}
                {entry.reversalOfEntryId && (
                  <Badge variant="outline">Estorno</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Data/Hora"
                  value={formatDateTimeBR(entry.occurredAt)}
                />
                <Field
                  label="Valor"
                  value={
                    <span
                      className={
                        isIn
                          ? "text-success font-semibold"
                          : "text-destructive font-semibold"
                      }
                    >
                      {isIn ? "+" : "-"}
                      {formatCurrencyBRL(entry.amount)}
                    </span>
                  }
                />
                <Field
                  label="Categoria"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: category?.color ?? "#64748B",
                        }}
                      />
                      {category?.name ?? "—"}
                    </span>
                  }
                />
                <Field
                  label="Forma de pagamento"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <PaymentMethodIcon className="h-3.5 w-3.5" />
                      {paymentMethod?.name ?? "—"}
                    </span>
                  }
                />
                <Field
                  label={isIn ? "Paciente" : "Justificativa"}
                  value={
                    isIn
                      ? (entry.patientName ?? "—")
                      : (entry.withdrawalReason ?? "—")
                  }
                />
                <Field label="Usuário" value={entry.createdByUserName} />
              </div>

              {entry.description && (
                <Field label="Descrição" value={entry.description} />
              )}

              {canReverse && !entry.isReversed && !entry.reversalOfEntryId && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setReversing(true)}
                >
                  Estornar
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ReverseEntryDialog
        entryId={reversing ? (entry?.id ?? null) : null}
        open={reversing}
        onOpenChange={(next) => {
          setReversing(next);
          if (!next) onOpenChange(false);
        }}
      />
    </>
  );
}
