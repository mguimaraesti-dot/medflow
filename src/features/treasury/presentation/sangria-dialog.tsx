"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestSangriaSchema,
  type RequestSangriaInput,
} from "../application/dtos/request-sangria.dto";
import { useRequestSangria } from "./use-request-sangria";
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
import { toast } from "sonner";

/** Sangria — remove dinheiro do caixa aberto e credita o Cofre (ADR 2.8). */
export function SangriaDialog() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const requestSangria = useRequestSangria();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestSangriaInput>({
    resolver: zodResolver(requestSangriaSchema),
  });

  async function onSubmit(values: RequestSangriaInput) {
    setServerError(null);
    try {
      await requestSangria.mutateAsync(values);
      setOpen(false);
      reset();
      toast.success("Sangria registrada.");
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível registrar a sangria.",
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
          Solicitar sangria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Solicitar sangria</DialogTitle>
            <DialogDescription>
              Remove dinheiro do caixa aberto e credita o Cofre. Exige um caixa
              aberto no momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sangria-amount">Valor</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput
                    id="sangria-amount"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.amount && (
                <p className="text-destructive text-sm">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sangria-reason">Motivo (opcional)</Label>
              <Textarea id="sangria-reason" rows={2} {...register("reason")} />
              {errors.reason && (
                <p className="text-destructive text-sm">
                  {errors.reason.message}
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
            <Button type="submit" disabled={requestSangria.isPending}>
              {requestSangria.isPending
                ? "Registrando..."
                : "Registrar sangria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
