"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePayAccountsPayable } from "./use-pay-accounts-payable";
import { usePaymentMethods } from "@/features/payment-methods/presentation/use-payment-methods";
import { PaymentMethodPicker } from "@/shared/components/payment-method-picker";
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

export function PayAccountsPayableDialog({
  accountsPayableId,
  open,
  onOpenChange,
}: {
  accountsPayableId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: paymentMethods } = usePaymentMethods();
  const payAccountsPayable = usePayAccountsPayable();

  async function onConfirm() {
    if (!accountsPayableId || !paymentMethodId) return;
    setServerError(null);
    try {
      await payAccountsPayable.mutateAsync({
        accountsPayableId,
        input: { paymentMethodId },
      });
      onOpenChange(false);
      setPaymentMethodId("");
      toast.success("Conta paga.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível pagar a conta.";
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
            Gera um lançamento de saída no caixa de hoje, vinculado a esta
            conta. Requer caixa aberto.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <PaymentMethodPicker
            paymentMethods={paymentMethods}
            value={paymentMethodId}
            onChange={setPaymentMethodId}
          />
        </div>

        {serverError && (
          <p className="text-destructive text-sm" role="alert">
            {serverError}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            disabled={!paymentMethodId || payAccountsPayable.isPending}
            onClick={onConfirm}
          >
            {payAccountsPayable.isPending
              ? "Pagando..."
              : "Confirmar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
