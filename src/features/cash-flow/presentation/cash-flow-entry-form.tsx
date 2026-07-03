"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createCashFlowEntrySchema } from "../application/dtos/create-cash-flow-entry.dto";
import { useCreateCashFlowEntry } from "./use-create-cash-flow-entry";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { usePaymentMethods } from "@/features/payment-methods/presentation/use-payment-methods";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

// O formulário nunca coleta `occurredAt` (o use case usa o horário do
// servidor por padrão) — omitido aqui para evitar o tipo `unknown` que
// `z.coerce.date()` produz na entrada do resolver do RHF.
const cashFlowEntryFormSchema = createCashFlowEntrySchema.omit({
  occurredAt: true,
});
type CashFlowEntryFormValues = z.infer<typeof cashFlowEntryFormSchema>;

const emptyFormValues: CashFlowEntryFormValues = {
  type: "IN",
  amount: 0,
  categoryId: "",
  paymentMethodId: "",
  description: "",
};

export function CashFlowEntryForm({ disabled }: { disabled: boolean }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createCashFlowEntry = useCreateCashFlowEntry();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CashFlowEntryFormValues>({
    resolver: zodResolver(cashFlowEntryFormSchema),
    defaultValues: emptyFormValues,
  });

  const type = watch("type");
  const { data: categories } = useCategories(type);
  const { data: paymentMethods } = usePaymentMethods();

  async function onSubmit(values: CashFlowEntryFormValues) {
    setServerError(null);
    try {
      await createCashFlowEntry.mutateAsync(values);
      reset({ ...emptyFormValues, type });
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível lançar a movimentação.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo lançamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={field.value === "IN" ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => {
                    field.onChange("IN");
                    reset({ ...emptyFormValues, type: "IN" });
                  }}
                >
                  Entrada
                </Button>
                <Button
                  type="button"
                  variant={field.value === "OUT" ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => {
                    field.onChange("OUT");
                    reset({ ...emptyFormValues, type: "OUT" });
                  }}
                >
                  Saída
                </Button>
              </div>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={0.01}
                disabled={disabled}
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-destructive text-sm">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    disabled={disabled}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="categoryId" className="w-full">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-destructive text-sm">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethodId">Forma de pagamento</Label>
              <Controller
                control={control}
                name="paymentMethodId"
                render={({ field }) => (
                  <Select
                    disabled={disabled}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="paymentMethodId" className="w-full">
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods?.map((paymentMethod) => (
                        <SelectItem
                          key={paymentMethod.id}
                          value={paymentMethod.id}
                        >
                          {paymentMethod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMethodId && (
                <p className="text-destructive text-sm">
                  {errors.paymentMethodId.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                rows={2}
                disabled={disabled}
                {...register("description")}
              />
            </div>
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={disabled || createCashFlowEntry.isPending}
          >
            {createCashFlowEntry.isPending ? "Lançando..." : "Lançar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
