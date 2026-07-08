"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Unlock } from "lucide-react";
import {
  openCashRegisterSchema,
  type OpenCashRegisterInput,
} from "@/features/cash-register/application/dtos/open-cash-register.dto";
import { useOpenCashRegister } from "./use-open-cash-register";
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
 * Abertura normal do caixa — fluxo distinto de "Reabrir Caixa"
 * (`ReopenRegisterDialog`): aqui não existe justificativa nem menção a
 * auditoria, só o valor inicial em dinheiro (Refinamento UX — os dois
 * fluxos não devem ser confundidos/reaproveitados um pelo outro).
 */
export function OpenRegisterDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const openCashRegister = useOpenCashRegister();
  const amountInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpenCashRegisterInput>({
    resolver: zodResolver(openCashRegisterSchema),
  });

  async function onSubmit(values: OpenCashRegisterInput) {
    setServerError(null);
    try {
      await openCashRegister.mutateAsync(values);
      setOpen(false);
      reset();
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível abrir o caixa.",
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
        <Button type="button" disabled={disabled}>
          <Unlock className="h-4 w-4" />
          Abrir Caixa
        </Button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          amountInputRef.current?.focus();
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>
              Informe o valor inicial em dinheiro na gaveta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="openingBalance">Valor inicial em dinheiro</Label>
            <Controller
              control={control}
              name="openingBalance"
              render={({ field }) => (
                <CurrencyInput
                  ref={amountInputRef}
                  id="openingBalance"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.openingBalance && (
              <p className="text-destructive text-sm">
                {errors.openingBalance.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={openCashRegister.isPending}>
              {openCashRegister.isPending ? "Abrindo..." : "Abrir Caixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
