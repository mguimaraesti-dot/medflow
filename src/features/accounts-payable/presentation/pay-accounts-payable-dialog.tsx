"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePayAccountsPayable } from "./use-pay-accounts-payable";
import { useSafeSummary } from "@/features/treasury/presentation/use-safe-summary";
import { formatCurrencyBRL } from "@/shared/lib/format";
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
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/**
 * Origem do pagamento (Banco/Cofre) já foi decidida no cadastro/edição da
 * conta — aqui só exibe, sem seletor. Quando COFRE, mostra o saldo atual
 * da Tesouraria pra o usuário perceber saldo insuficiente antes de
 * confirmar (o erro real, se mesmo assim tentar, vem do backend).
 */
export function PayAccountsPayableDialog({
  payable,
  open,
  onOpenChange,
}: {
  payable: AccountsPayableResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const payAccountsPayable = usePayAccountsPayable();
  const isCofre = payable?.paymentOrigin === "COFRE";
  const { data: safe } = useSafeSummary();

  async function onConfirm() {
    if (!payable) return;
    setServerError(null);
    try {
      await payAccountsPayable.mutateAsync(payable.id);
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
            Confirmar que esta conta foi paga via{" "}
            {isCofre ? "🟢 Cofre" : "🏦 Banco"}?
          </DialogDescription>
        </DialogHeader>

        {isCofre && safe && (
          <p className="text-muted-foreground text-sm">
            Saldo atual do Cofre: {formatCurrencyBRL(safe.balance)}
          </p>
        )}

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
