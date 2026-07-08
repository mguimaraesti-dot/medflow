"use client";

import { useState } from "react";
import { ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { useManualAdjustment } from "./use-manual-adjustment";
import { ApiError } from "@/shared/lib/api-client";
import { CurrencyInput } from "@/shared/components/currency-input";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

/**
 * "Retirada" — entrada simplificada pro mesmo use case de Ajuste
 * Manual, só que com a direção travada em "remover" (sem seletor).
 * Pensada pra saídas de dinheiro do Cofre pra pagamentos (fornecedor,
 * despesa emergencial etc.), sem o operador precisar entender o
 * conceito de "ajuste com sinal" (Refinamento UX/UI Tesouraria).
 */
export function WithdrawalDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const manualAdjustment = useManualAdjustment();

  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < 10;
  const canSubmit = amount > 0 && reason.trim().length >= 10;

  function reset() {
    setAmount(0);
    setReason("");
  }

  async function onSubmit() {
    setServerError(null);
    try {
      await manualAdjustment.mutateAsync({
        amount: -amount,
        reason: reason.trim(),
      });
      setOpen(false);
      reset();
      toast.success("Retirada registrada.");
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível registrar a retirada.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive h-10 flex-1 sm:flex-none"
        >
          <ArrowUpCircle className="h-4 w-4" />
          Retirada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirada do Cofre</DialogTitle>
          <DialogDescription>
            Registra uma saída de dinheiro do Cofre, como pagamento a fornecedor
            ou despesa emergencial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="withdrawal-amount">Valor</Label>
            <CurrencyInput
              id="withdrawal-amount"
              value={amount}
              onChange={setAmount}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawal-reason">Descrição</Label>
            <Textarea
              id="withdrawal-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {reasonTooShort && (
              <p className="text-destructive text-sm">
                A descrição precisa ter pelo menos 10 caracteres.
              </p>
            )}
          </div>
        </div>

        {serverError && (
          <p className="text-destructive text-sm" role="alert">
            {serverError}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            disabled={!canSubmit || manualAdjustment.isPending}
            onClick={onSubmit}
          >
            {manualAdjustment.isPending ? "Registrando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
