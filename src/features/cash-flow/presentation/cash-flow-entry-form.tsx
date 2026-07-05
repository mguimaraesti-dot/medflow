"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { createCashFlowEntrySchema } from "../application/dtos/create-cash-flow-entry.dto";
import { useCreateCashFlowEntry } from "./use-create-cash-flow-entry";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { usePaymentMethods } from "@/features/payment-methods/presentation/use-payment-methods";
import { CategoryCombobox } from "@/shared/components/category-combobox";
import { ApiError } from "@/shared/lib/api-client";
import { SegmentedControl } from "@/shared/components/segmented-control";
import { CurrencyInput } from "@/shared/components/currency-input";
import { PaymentMethodPicker } from "@/shared/components/payment-method-picker";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
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
      toast.success(
        values.type === "IN" ? "Entrada lançada." : "Saída lançada.",
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível lançar a movimentação.";
      setServerError(message);
      toast.error(message);
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
          className="space-y-5"
          noValidate
        >
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <SegmentedControl
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                options={[
                  {
                    value: "IN",
                    label: "Entrada",
                    activeClassName: "bg-green-600",
                  },
                  {
                    value: "OUT",
                    label: "Saída",
                    activeClassName: "bg-destructive",
                  },
                ]}
              />
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput
                    id="amount"
                    disabled={disabled}
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
              <Label htmlFor="categoryId">Categoria</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CategoryCombobox
                    id="categoryId"
                    disabled={disabled}
                    categories={categories}
                    type={type}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.categoryId && (
                <p className="text-destructive text-sm">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Controller
              control={control}
              name="paymentMethodId"
              render={({ field }) => (
                <PaymentMethodPicker
                  disabled={disabled}
                  paymentMethods={paymentMethods}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.paymentMethodId && (
              <p className="text-destructive text-sm">
                {errors.paymentMethodId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              rows={2}
              disabled={disabled}
              {...register("description")}
            />
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={disabled || createCashFlowEntry.isPending}
            className="from-primary w-full bg-gradient-to-b to-blue-600 shadow-sm"
          >
            {createCashFlowEntry.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Lançando...
              </>
            ) : (
              "Lançar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
