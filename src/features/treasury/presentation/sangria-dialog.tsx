"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownCircle } from "lucide-react";
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

/**
 * "Receber do Caixa" — por baixo dos panos ainda é a Sangria (remove
 * dinheiro do caixa aberto e credita o Cofre), só que sem expor o termo
 * técnico na interface (Refinamento UX/UI Tesouraria). Continua exigindo
 * um caixa aberto no momento.
 */
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
      toast.success("Recebimento registrado.");
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
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 border-green-600/40 text-green-600 hover:bg-green-600/10 hover:text-green-600 sm:flex-none dark:text-green-500"
        >
          <ArrowDownCircle className="h-4 w-4" />
          Receber do Caixa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Receber do Caixa</DialogTitle>
            <DialogDescription>
              Registra o dinheiro recebido da Caixa Recepção e credita o Cofre.
              Exige um caixa aberto no momento.
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
              <Label htmlFor="sangria-reason">Descrição (opcional)</Label>
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
              {requestSangria.isPending ? "Registrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
