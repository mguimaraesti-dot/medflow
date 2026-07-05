"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { createAccountsPayableSchema } from "../application/dtos/create-accounts-payable.dto";
import { useCreateAccountsPayable } from "./use-create-accounts-payable";
import { SupplierCombobox } from "@/shared/components/supplier-combobox";
import { CategoryCombobox } from "@/shared/components/category-combobox";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { ApiError } from "@/shared/lib/api-client";
import { CurrencyInput } from "@/shared/components/currency-input";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

// Formulário usa <input type="date"> (string) em vez de z.coerce.date()
// direto — evita o mesmo problema de tipo `unknown` já resolvido no
// formulário de lançamento do Fluxo de Caixa (Task 5B).
const accountsPayableFormSchema = createAccountsPayableSchema.extend({
  dueDate: z.string().min(1, "Informe o vencimento"),
});
export type AccountsPayableFormValues = z.infer<
  typeof accountsPayableFormSchema
>;

const emptyFormValues: AccountsPayableFormValues = {
  supplierId: "",
  categoryId: "",
  description: "",
  amount: 0,
  dueDate: "",
  barcode: "",
  digitableLine: "",
  pixKey: "",
  qrCodeUrl: "",
  boletoPdfUrl: "",
};

/**
 * Sem `<Card>` próprio — quem renderiza (inline ou dentro de um Dialog,
 * Design Pass) decide o container. `initialValues` é usado pelo
 * "Duplicar" (pré-preenche fornecedor/categoria/valor/descrição, mas
 * não o vencimento — o usuário escolhe uma nova data).
 */
export function AccountsPayableForm({
  onSuccess,
  initialValues,
}: {
  onSuccess?: () => void;
  initialValues?: Partial<AccountsPayableFormValues>;
}) {
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const createAccountsPayable = useCreateAccountsPayable();
  const { data: categories } = useCategories("OUT");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountsPayableFormValues>({
    resolver: zodResolver(accountsPayableFormSchema),
    defaultValues: { ...emptyFormValues, ...initialValues },
  });

  async function onSubmit(values: AccountsPayableFormValues) {
    setServerError(null);
    try {
      await createAccountsPayable.mutateAsync({
        ...values,
        dueDate: new Date(values.dueDate),
      });
      reset(emptyFormValues);
      toast.success("Conta a pagar cadastrada.");
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível cadastrar a conta.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplierId">Fornecedor</Label>
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <SupplierCombobox
                id="supplierId"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.supplierId && (
            <p className="text-destructive text-sm">
              {errors.supplierId.message}
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
                categories={categories}
                type="OUT"
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

        <div className="space-y-2">
          <Label htmlFor="amount">Valor</Label>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <CurrencyInput
                id="amount"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.amount && (
            <p className="text-destructive text-sm">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Vencimento</Label>
          <Input id="dueDate" type="date" {...register("dueDate")} />
          {errors.dueDate && (
            <p className="text-destructive text-sm">{errors.dueDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" rows={2} {...register("description")} />
        {errors.description && (
          <p className="text-destructive text-sm">
            {errors.description.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowMoreFields((prev) => !prev)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ChevronDown
          className={
            showMoreFields
              ? "h-4 w-4 rotate-180 transition-transform"
              : "h-4 w-4 transition-transform"
          }
        />
        Mais dados do boleto (opcional)
      </button>

      {showMoreFields && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="barcode">Código de barras</Label>
            <Input id="barcode" {...register("barcode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="digitableLine">Linha digitável</Label>
            <Input id="digitableLine" {...register("digitableLine")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input id="pixKey" {...register("pixKey")} />
          </div>
        </div>
      )}

      {serverError && (
        <p className="text-destructive text-sm" role="alert">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        disabled={createAccountsPayable.isPending}
        className="from-primary w-full bg-gradient-to-b to-blue-600 shadow-sm"
      >
        {createAccountsPayable.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          "Cadastrar conta"
        )}
      </Button>
    </form>
  );
}
