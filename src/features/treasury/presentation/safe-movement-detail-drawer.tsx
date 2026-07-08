"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import {
  formatCurrencyBRL,
  formatDateOnlyLocalBR,
  formatTimeBR,
} from "@/shared/lib/format";
import { Field } from "@/shared/components/detail-field";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";
import { describeMovement, isMovementIn } from "./safe-movement-display";

export function SafeMovementDetailDrawer({
  movement,
  open,
  onOpenChange,
}: {
  movement: SafeMovementResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isIn = movement ? isMovementIn(movement) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Movimentação do Cofre</SheetTitle>
        </SheetHeader>

        {movement && (
          <div className="space-y-6 px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Data"
                value={formatDateOnlyLocalBR(movement.createdAt)}
              />
              <Field label="Hora" value={formatTimeBR(movement.createdAt)} />
              <Field label="Usuário" value={movement.performedByUserName} />
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
                    {formatCurrencyBRL(movement.amount.replace("-", ""))}
                  </span>
                }
              />
            </div>

            <Field label="Descrição" value={describeMovement(movement)} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
