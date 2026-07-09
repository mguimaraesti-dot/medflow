"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useManualAdjustment } from "./use-manual-adjustment";
import { ApiError } from "@/shared/lib/api-client";
import { CurrencyInput } from "@/shared/components/currency-input";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { toast } from "sonner";

type Direction = "ADD" | "REMOVE";

/**
 * Ajuste manual do Cofre — só Admin. `amount` no backend carrega o
 * próprio sinal (único tipo de `SafeMovement` sem direção implícita
 * pelo `type`); aqui a UI coleta a magnitude (sempre positiva, via
 * `CurrencyInput`) + uma direção, e monta o valor com sinal antes de
 * enviar — evita criar um input monetário novo que aceite negativos.
 */
export function ManualAdjustmentDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [direction, setDirection] = useState<Direction>("ADD");
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const manualAdjustment = useManualAdjustment();

  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < 10;
  const canSubmit = amount > 0 && reason.trim().length >= 10;

  function reset() {
    setAmount(0);
    setDirection("ADD");
    setReason("");
  }

  async function onSubmit() {
    setServerError(null);
    try {
      await manualAdjustment.mutateAsync({
        amount: direction === "REMOVE" ? -amount : amount,
        reason: reason.trim(),
      });
      setOpen(false);
      reset();
      toast.success("Ajuste registrado.");
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível registrar o ajuste.",
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
          className="h-10 flex-1 border-blue-600/40 text-blue-600 hover:bg-blue-600/10 hover:text-blue-600 sm:flex-none dark:text-blue-500"
        >
          <Settings2 className="h-4 w-4" />
          Ajuste de Saldo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste de Saldo do Cofre</DialogTitle>
          <DialogDescription>
            Uso administrativo, fora do fluxo normal de caixa. Registrado em
            auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-2">
              <Label htmlFor="adjustment-amount">Valor</Label>
              <CurrencyInput
                id="adjustment-amount"
                value={amount}
                onChange={setAmount}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-direction">Direção</Label>
              <Select
                value={direction}
                onValueChange={(value) => setDirection(value as Direction)}
              >
                <SelectTrigger id="adjustment-direction" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Adicionar ao Cofre</SelectItem>
                  <SelectItem value="REMOVE">Remover do Cofre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment-reason">Justificativa</Label>
            <Textarea
              id="adjustment-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {reasonTooShort && (
              <p className="text-destructive text-sm">
                A justificativa precisa ter pelo menos 10 caracteres.
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
            {manualAdjustment.isPending ? "Registrando..." : "Confirmar ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
