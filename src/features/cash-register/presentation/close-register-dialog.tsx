"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import {
  closeCashRegisterSchema,
  type CloseCashRegisterInput,
} from "@/features/cash-register/application/dtos/close-cash-register.dto";
import { useCloseCashRegister } from "./use-close-cash-register";
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
 * Fechar caixa exige prestação de contas (ADR 2.7/2.8): a secretária
 * informa o valor contado e o caixa é encerrado. Internamente o registro
 * vai para `PENDING_CONFERENCE` até a gerência confirmar o handoff ou
 * rejeitar, mas isso é conferência de gestão — a tela da secretária (Caixa
 * Recepção) não expõe esse estado intermediário (Refinamento UX/UI Caixa
 * Recepção, item 8).
 */
export function CloseRegisterDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const closeCashRegister = useCloseCashRegister();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CloseCashRegisterInput>({
    resolver: zodResolver(closeCashRegisterSchema),
  });

  async function onSubmit(values: CloseCashRegisterInput) {
    setServerError(null);
    try {
      await closeCashRegister.mutateAsync(values);
      setOpen(false);
      reset();
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível fechar o caixa.",
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
          className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-11 rounded-xl transition-colors duration-200"
          disabled={disabled}
        >
          <Lock className="h-4 w-4" />
          Fechar Caixa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>
              Informe o valor contado na gaveta. O caixa é encerrado
              imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="countedAmount">Valor contado</Label>
              <Controller
                control={control}
                name="countedAmount"
                render={({ field }) => (
                  <CurrencyInput
                    id="countedAmount"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.countedAmount && (
                <p className="text-destructive text-sm">
                  {errors.countedAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="closureNote">Observação (opcional)</Label>
              <Textarea
                id="closureNote"
                rows={2}
                {...register("closureNote")}
              />
              {errors.closureNote && (
                <p className="text-destructive text-sm">
                  {errors.closureNote.message}
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
            <Button type="submit" disabled={closeCashRegister.isPending}>
              {closeCashRegister.isPending
                ? "Fechando..."
                : "Confirmar fechamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
