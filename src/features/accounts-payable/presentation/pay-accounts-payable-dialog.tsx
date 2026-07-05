"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePayAccountsPayable } from "./use-pay-accounts-payable";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

/**
 * MVP atual não faz controle financeiro nesta tela — confirmar
 * pagamento só muda o status pra "Pago" (sem caixa, forma de pagamento
 * ou lançamento de Fluxo de Caixa vinculado).
 */
export function PayAccountsPayableDialog({
  accountsPayableId,
  open,
  onOpenChange,
}: {
  accountsPayableId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const payAccountsPayable = usePayAccountsPayable();

  async function onConfirm() {
    if (!accountsPayableId) return;
    setServerError(null);
    try {
      await payAccountsPayable.mutateAsync(accountsPayableId);
      onOpenChange(false);
      toast.success("Conta marcada como paga.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível confirmar o pagamento.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogDescription>
            Confirmar que esta conta foi paga?
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <p className="text-destructive text-sm" role="alert">
            {serverError}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={payAccountsPayable.isPending}
            onClick={onConfirm}
          >
            {payAccountsPayable.isPending ? "Confirmando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
