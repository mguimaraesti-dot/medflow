"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  rejectConferenceSchema,
  type RejectConferenceInput,
} from "@/features/cash-register/application/dtos/reject-conference.dto";
import { useRejectConference } from "./use-reject-conference";
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

/** Devolve o caixa pra OPEN sem mexer no Cofre (ADR 2.1/Seção 5, Q2) — distinta da Reabertura. */
export function RejectConferenceDialog() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const rejectConference = useRejectConference();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectConferenceInput>({
    resolver: zodResolver(rejectConferenceSchema),
  });

  async function onSubmit(values: RejectConferenceInput) {
    setServerError(null);
    try {
      await rejectConference.mutateAsync(values);
      setOpen(false);
      reset();
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível rejeitar a conferência.",
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
        <Button type="button" variant="outline" size="sm">
          Rejeitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Rejeitar conferência</DialogTitle>
            <DialogDescription>
              Informe o motivo. O caixa volta para Aberto e a secretária precisa
              fechar novamente.
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
            <Button type="submit" disabled={rejectConference.isPending}>
              {rejectConference.isPending
                ? "Rejeitando..."
                : "Confirmar rejeição"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
