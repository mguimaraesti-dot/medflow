"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import {
  formatCurrencyBRL,
  formatDateOnlyLocalBR,
  formatDateTimeBR,
  formatTimeBR,
} from "@/shared/lib/format";
import { Field } from "@/shared/components/detail-field";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";
import { describeMovement, isMovementIn } from "./safe-movement-display";
import { ConfirmSafeMovementDialog } from "./confirm-safe-movement-dialog";
import { CancelSafeMovementDialog } from "./cancel-safe-movement-dialog";

/**
 * Além dos botões inline na tabela, o Drawer aberto ao clicar na linha
 * também precisa permitir confirmar/rejeitar — antes era só leitura, então
 * uma movimentação `PENDING` (ex: recebimento do fechamento do Caixa
 * Recepção) só podia ser resolvida fechando o Drawer e usando os botões da
 * linha, sem opção nenhuma na própria tela de detalhe.
 */
export function SafeMovementDetailDrawer({
  movement,
  canConfirm,
  open,
  onOpenChange,
}: {
  movement: SafeMovementResponseDTO | null;
  canConfirm: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isIn = movement ? isMovementIn(movement) : false;
  const showActions =
    canConfirm && movement !== null && movement.status === "PENDING";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>Movimentação do Cofre</SheetTitle>
          </SheetHeader>

          {movement && (
            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Data"
                  value={formatDateOnlyLocalBR(movement.createdAt)}
                />
                <Field label="Hora" value={formatTimeBR(movement.createdAt)} />
                <Field
                  label="Criado por"
                  value={movement.performedByUserName}
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
                      {formatCurrencyBRL(movement.amount.replace("-", ""))}
                    </span>
                  }
                />
              </div>

              {movement.confirmedByUserName && (
                <Field
                  label="Confirmado por"
                  value={
                    <span className="text-success">
                      {movement.confirmedByUserName}
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        em {formatDateTimeBR(movement.confirmedAt!)}
                      </span>
                    </span>
                  }
                />
              )}

              <Field label="Descrição" value={describeMovement(movement)} />
            </div>
          )}

          {showActions && (
            <div className="flex gap-2 border-t p-4">
              <Button
                type="button"
                className="flex-1"
                onClick={() => setConfirming(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelling(true)}
              >
                <XCircle className="h-4 w-4" />
                Rejeitar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmSafeMovementDialog
        movement={confirming ? movement : null}
        open={confirming}
        onOpenChange={setConfirming}
        onConfirmed={() => onOpenChange(false)}
      />
      <CancelSafeMovementDialog
        movement={cancelling ? movement : null}
        open={cancelling}
        onOpenChange={setCancelling}
        onCancelled={() => onOpenChange(false)}
      />
    </>
  );
}
