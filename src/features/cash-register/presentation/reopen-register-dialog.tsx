"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reopenCashRegisterSchema,
  type ReopenCashRegisterInput,
} from "@/features/cash-register/application/dtos/reopen-cash-register.dto";
import { useReopenCashRegister } from "./use-reopen-cash-register";
import { ApiError } from "@/shared/lib/api-client";
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
 * Fluxo excepcional: reabre um caixa que já foi fechado hoje, sempre
 * com justificativa obrigatória e registro em auditoria. Distinto de
 * `OpenRegisterDialog` (abertura normal do dia, sem justificativa) —
 * os dois fluxos não devem ser confundidos nem reaproveitar o texto um
 * do outro (Refinamento UX).
 */
export function ReopenRegisterDialog({
  cashRegisterDayId,
}: {
  cashRegisterDayId: string;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const reopenCashRegister = useReopenCashRegister(cashRegisterDayId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReopenCashRegisterInput>({
    resolver: zodResolver(reopenCashRegisterSchema),
  });

  async function onSubmit(values: ReopenCashRegisterInput) {
    setServerError(null);
    try {
      await reopenCashRegister.mutateAsync(values);
      setOpen(false);
      reset();
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível reabrir o caixa.",
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
        <Button type="button" variant="outline">
          Reabrir Caixa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Reabrir Caixa</DialogTitle>
            <DialogDescription>
              Informe o motivo da reabertura. Esta ação é registrada em
              auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="reason">Justificativa</Label>
            <Textarea id="reason" rows={3} {...register("reason")} />
            {errors.reason && (
              <p className="text-destructive text-sm">
                {errors.reason.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={reopenCashRegister.isPending}>
              {reopenCashRegister.isPending
                ? "Reabrindo..."
                : "Confirmar Reabertura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
