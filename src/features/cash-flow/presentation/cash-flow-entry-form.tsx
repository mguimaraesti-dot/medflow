"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { baseCreateCashFlowEntrySchema } from "../application/dtos/create-cash-flow-entry.dto";
import { useCreateCashFlowEntry } from "./use-create-cash-flow-entry";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { usePaymentMethods } from "@/features/payment-methods/presentation/use-payment-methods";
import { CategoryCombobox } from "@/shared/components/category-combobox";
import { ApiError } from "@/shared/lib/api-client";
import { SegmentedControl } from "@/shared/components/segmented-control";
import { CurrencyInput } from "@/shared/components/currency-input";
import { PaymentMethodPicker } from "@/shared/components/payment-method-picker";
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

const WITHDRAWAL_REASON_OPTIONS = [
  "Pagamento de fornecedor",
  "Compra de material",
  "Sangria",
  "Troco",
  "Despesa administrativa",
  "Pagamento de funcionário",
  "Outros",
] as const;
const WITHDRAWAL_REASON_OTHER = "Outros";

// O formulário nunca coleta `occurredAt` (o use case usa o horário do
// servidor por padrão) — omitido aqui para evitar o tipo `unknown` que
// `z.coerce.date()` produz na entrada do resolver do RHF. As mesmas
// regras condicionais de `createCashFlowEntrySchema` são reaplicadas
// aqui em cima do schema já sem `occurredAt`.
const cashFlowEntryFormSchema = baseCreateCashFlowEntrySchema
  .omit({ occurredAt: true })
  .refine((data) => data.type !== "IN" || Boolean(data.patientName), {
    path: ["patientName"],
    message: "Informe o nome do paciente",
  })
  .refine((data) => data.type !== "OUT" || Boolean(data.withdrawalReason), {
    path: ["withdrawalReason"],
    message: "Informe a justificativa da retirada",
  });
type CashFlowEntryFormValues = z.infer<typeof cashFlowEntryFormSchema>;

const emptyFormValues: CashFlowEntryFormValues = {
  type: "IN",
  amount: 0,
  categoryId: "",
  paymentMethodId: "",
  description: "",
  patientName: "",
  withdrawalReason: "",
};

export function CashFlowEntryForm({ disabled }: { disabled: boolean }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createCashFlowEntry = useCreateCashFlowEntry();
  const amountInputRef = useRef<HTMLInputElement>(null);
  // Vive fora do RHF de propósito: o valor final que vai pro campo
  // `withdrawalReason` é a própria opção escolhida (ou o texto digitado
  // quando a opção é "Outros") — esta seleção é só um meio de preencher
  // aquele único campo, não um campo próprio do DTO.
  const [withdrawalReasonOption, setWithdrawalReasonOption] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CashFlowEntryFormValues>({
    resolver: zodResolver(cashFlowEntryFormSchema),
    defaultValues: emptyFormValues,
  });

  const type = watch("type");
  const { data: categories } = useCategories(type);
  const { data: paymentMethods } = usePaymentMethods();
  // Caixa Recepção só opera em dinheiro/PIX na prática — restringe as opções
  // exibidas por tipo de lançamento (Refinamento UX/UI Caixa Recepção).
  const allowedNames = type === "IN" ? ["Dinheiro", "PIX"] : ["Dinheiro"];
  const availablePaymentMethods = paymentMethods?.filter((method) =>
    allowedNames.includes(method.name),
  );

  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  // F2/F3 trocam o tipo do lançamento de qualquer lugar da tela, exceto
  // quando um diálogo (Fechar Caixa, Estornar, etc.) está aberto — nunca
  // competem com atalhos do próprio diálogo.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (document.querySelector('[role="dialog"]')) return;
      if (event.key === "F2") {
        event.preventDefault();
        setValue("type", "IN");
        setValue("paymentMethodId", "");
        setWithdrawalReasonOption("");
      } else if (event.key === "F3") {
        event.preventDefault();
        setValue("type", "OUT");
        setValue("paymentMethodId", "");
        setWithdrawalReasonOption("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setValue]);

  async function onSubmit(values: CashFlowEntryFormValues) {
    setServerError(null);
    try {
      await createCashFlowEntry.mutateAsync(values);
      reset({ ...emptyFormValues, type });
      setWithdrawalReasonOption("");
      amountInputRef.current?.focus();
      toast.success(
        values.type === "IN"
          ? "✅ Entrada registrada com sucesso"
          : "✅ Saída registrada com sucesso",
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
          onKeyDown={(event) => {
            // Esc só é tratado aqui (não em `window`) pra nunca competir
            // com o Esc nativo do Radix fechando um Dialog aberto.
            if (event.key === "Escape") {
              reset({ ...emptyFormValues, type });
              setWithdrawalReasonOption("");
              amountInputRef.current?.focus();
            }
          }}
          className="space-y-5"
          noValidate
        >
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <SegmentedControl
                size="lg"
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  // Forma de pagamento pode não estar mais disponível
                  // para o novo tipo (ex: PIX só existe em Entrada).
                  setValue("paymentMethodId", "");
                  setWithdrawalReasonOption("");
                }}
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
                    ref={amountInputRef}
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
                  paymentMethods={availablePaymentMethods}
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

          {type === "IN" && (
            <div className="space-y-2">
              <Label htmlFor="patientName">Nome do Paciente</Label>
              <Input
                id="patientName"
                disabled={disabled}
                {...register("patientName")}
              />
              {errors.patientName && (
                <p className="text-destructive text-sm">
                  {errors.patientName.message}
                </p>
              )}
            </div>
          )}

          {type === "OUT" && (
            <div className="space-y-2">
              <Label htmlFor="withdrawalReasonOption">
                Justificativa da Retirada
              </Label>
              <Select
                value={withdrawalReasonOption}
                onValueChange={(next) => {
                  setWithdrawalReasonOption(next);
                  setValue(
                    "withdrawalReason",
                    next === WITHDRAWAL_REASON_OTHER ? "" : next,
                  );
                }}
                disabled={disabled}
              >
                <SelectTrigger id="withdrawalReasonOption" className="w-full">
                  <SelectValue placeholder="Selecione a justificativa" />
                </SelectTrigger>
                <SelectContent>
                  {WITHDRAWAL_REASON_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {withdrawalReasonOption === WITHDRAWAL_REASON_OTHER && (
                <Input
                  aria-label="Justificativa da retirada (digitada)"
                  placeholder="Digite a justificativa"
                  disabled={disabled}
                  {...register("withdrawalReason")}
                />
              )}
              {errors.withdrawalReason && (
                <p className="text-destructive text-sm">
                  {errors.withdrawalReason.message}
                </p>
              )}
            </div>
          )}

          {type === "IN" && (
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                rows={2}
                disabled={disabled}
                {...register("description")}
              />
            </div>
          )}

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={disabled || createCashFlowEntry.isPending}
            className="from-primary to-brand-secondary w-full bg-gradient-to-b shadow-sm"
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
