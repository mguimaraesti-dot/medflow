"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { createAccountsPayableSchema } from "../application/dtos/create-accounts-payable.dto";
import { useCreateAccountsPayable } from "./use-create-accounts-payable";
import { SupplierCombobox } from "@/shared/components/supplier-combobox";
import { CategoryCombobox } from "@/shared/components/category-combobox";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { ApiError } from "@/shared/lib/api-client";
import { CurrencyInput } from "@/shared/components/currency-input";
import { FileDropZone } from "@/shared/components/file-drop-zone";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { RecurrenceInput } from "../application/dtos/create-accounts-payable.dto";

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

type Periodicity = RecurrenceInput["periodicity"];
type RecurrenceEnd = "UNLIMITED" | "AFTER_COUNT";

const PERIODICITY_LABEL: Record<Periodicity, string> = {
  MONTHLY: "Mensal",
  BIWEEKLY: "Quinzenal",
  WEEKLY: "Semanal",
  YEARLY: "Anual",
};

/**
 * Organizado em 3 Cards (Informações da Conta / Dados do Boleto /
 * Documentos, Sprint 06) para reduzir rolagem e melhorar a leitura em
 * telas desktop comuns. `initialValues` é usado pelo "Duplicar"
 * (pré-preenche fornecedor/categoria/valor/descrição, mas não o
 * vencimento — o usuário escolhe uma nova data).
 */
export function AccountsPayableForm({
  onSuccess,
  onCancel,
  initialValues,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: Partial<AccountsPayableFormValues>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [periodicity, setPeriodicity] = useState<Periodicity>("MONTHLY");
  const [recurrenceEnd, setRecurrenceEnd] =
    useState<RecurrenceEnd>("UNLIMITED");
  const [occurrenceCount, setOccurrenceCount] = useState("12");
  const [attachments, setAttachments] = useState<File[]>([]);
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
      // Documentos ainda não têm caso de uso no backend (exigem um model de
      // Attachment/Storage que ainda não existe) — por isso não entram no
      // payload, mesmo já coletados na tela.
      const maxOccurrences =
        recurrenceEnd === "AFTER_COUNT"
          ? Number.parseInt(occurrenceCount, 10)
          : undefined;

      await createAccountsPayable.mutateAsync({
        ...values,
        dueDate: new Date(values.dueDate),
        recurrence: isRecurring ? { periodicity, maxOccurrences } : undefined,
      });
      reset(emptyFormValues);
      setIsRecurring(false);
      setPeriodicity("MONTHLY");
      setRecurrenceEnd("UNLIMITED");
      setOccurrenceCount("12");
      setAttachments([]);
      toast.success(
        isRecurring
          ? "Conta recorrente cadastrada."
          : "Conta a pagar cadastrada.",
      );
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <p className="text-destructive text-sm">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-destructive text-sm">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              Conta recorrente
            </label>
            {isRecurring && (
              <div className="space-y-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="periodicity">Periodicidade</Label>
                  <Select
                    value={periodicity}
                    onValueChange={(value) =>
                      setPeriodicity(value as Periodicity)
                    }
                  >
                    <SelectTrigger
                      id="periodicity"
                      className="w-full sm:w-[220px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERIODICITY_LABEL).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Término</Label>
                  <RadioGroup
                    value={recurrenceEnd}
                    onValueChange={(value) =>
                      setRecurrenceEnd(value as RecurrenceEnd)
                    }
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="UNLIMITED" />
                      Sem prazo
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="AFTER_COUNT" />
                      <span className="flex items-center gap-2">
                        Após
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={occurrenceCount}
                          disabled={recurrenceEnd !== "AFTER_COUNT"}
                          onChange={(event) =>
                            setOccurrenceCount(event.target.value)
                          }
                          className="h-8 w-20"
                        />
                        ocorrências
                      </span>
                    </label>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Observação</Label>
            <Textarea id="description" rows={2} {...register("description")} />
            {errors.description && (
              <p className="text-destructive text-sm">
                {errors.description.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dados do Boleto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Controller
                control={control}
                name="barcode"
                render={({ field }) => (
                  <Input
                    id="barcode"
                    inputMode="numeric"
                    placeholder="00000000000000000000000000000000000000000000"
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(event.target.value.replace(/\D/g, ""))
                    }
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input id="pixKey" {...register("pixKey")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <FileDropZone files={attachments} onChange={setAttachments} />
        </CardContent>
      </Card>

      {serverError && (
        <p className="text-destructive text-sm" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={createAccountsPayable.isPending}
          className="from-primary to-brand-secondary bg-gradient-to-b shadow-sm"
        >
          {createAccountsPayable.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar conta"
          )}
        </Button>
      </div>
    </form>
  );
}
