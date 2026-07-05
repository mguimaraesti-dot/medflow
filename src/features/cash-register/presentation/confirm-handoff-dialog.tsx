"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  confirmHandoffSchema,
  type ConfirmHandoffInput,
} from "@/features/cash-register/application/dtos/confirm-handoff.dto";
import { useConfirmHandoff } from "./use-confirm-handoff";
import { ApiError } from "@/shared/lib/api-client";
import { CurrencyInput } from "@/shared/components/currency-input";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
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
 * Confirmação do handoff (gerência) — segunda metade da dupla
 * conferência (ADR 2.1). `receivedAmount` é sugerido com o valor
 * contado pela secretária, mas pode divergir — é exatamente o ponto
 * da dupla conferência.
 */
export function ConfirmHandoffDialog({
  suggestedAmount,
}: {
  suggestedAmount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const confirmHandoff = useConfirmHandoff();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfirmHandoffInput>({
    resolver: zodResolver(confirmHandoffSchema),
    values: { receivedAmount: suggestedAmount ?? 0 },
  });

  async function onSubmit(values: ConfirmHandoffInput) {
    setServerError(null);
    try {
      await confirmHandoff.mutateAsync(values);
      setOpen(false);
      reset();
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível confirmar o recebimento.",
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
        <Button type="button" size="sm">
          Confirmar recebimento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Confirmar recebimento</DialogTitle>
            <DialogDescription>
              Informe o valor efetivamente recebido. O Cofre é creditado com
              este valor, mesmo que divirja do valor contado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="receivedAmount">Valor recebido</Label>
            <Controller
              control={control}
              name="receivedAmount"
              render={({ field }) => (
                <CurrencyInput
                  id="receivedAmount"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.receivedAmount && (
              <p className="text-destructive text-sm">
                {errors.receivedAmount.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={confirmHandoff.isPending}>
              {confirmHandoff.isPending ? "Confirmando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
