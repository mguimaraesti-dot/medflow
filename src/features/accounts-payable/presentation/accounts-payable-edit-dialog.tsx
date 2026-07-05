"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { SupplierCombobox } from "@/shared/components/supplier-combobox";
import { CategoryCombobox } from "@/shared/components/category-combobox";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { ApiError } from "@/shared/lib/api-client";
import { useUpdateAccountsPayable } from "./use-update-accounts-payable";
import {
  AccountsPayableRecurrenceScopeDialog,
  type RecurrenceScope,
} from "./accounts-payable-recurrence-scope-dialog";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

interface EditFormValues {
  supplierId: string;
  categoryId: string;
  dueDate: string;
  description: string;
}

function toFormValues(payable: AccountsPayableResponseDTO): EditFormValues {
  return {
    supplierId: payable.supplierId,
    categoryId: payable.categoryId,
    dueDate: new Date(payable.dueDate).toISOString().slice(0, 10),
    description: payable.description,
  };
}

/**
 * Edição escopada: fornecedor/categoria/vencimento/observação — nunca
 * valor (imutável fora do cadastro inicial). Quando a conta pertence a
 * uma recorrência, pergunta se a mudança vale só pra esta ocorrência ou
 * pras próximas também.
 */
export function AccountsPayableEditDialog({
  payable,
  open,
  onOpenChange,
}: {
  payable: AccountsPayableResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: categories } = useCategories("OUT");
  const updateAccountsPayable = useUpdateAccountsPayable();
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<EditFormValues | null>(
    null,
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    defaultValues: {
      supplierId: "",
      categoryId: "",
      dueDate: "",
      description: "",
    },
  });

  useEffect(() => {
    if (payable) reset(toFormValues(payable));
  }, [payable, reset]);

  async function submit(values: EditFormValues, scope: RecurrenceScope) {
    if (!payable) return;
    try {
      await updateAccountsPayable.mutateAsync({
        accountsPayableId: payable.id,
        input: { ...values, dueDate: new Date(values.dueDate), scope },
      });
      toast.success(
        scope === "SERIES"
          ? "Alteração aplicada a esta conta e às próximas."
          : "Conta atualizada.",
      );
      setScopeDialogOpen(false);
      setPendingValues(null);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível atualizar a conta.",
      );
    }
  }

  function onSubmit(values: EditFormValues) {
    if (payable?.recurringBillId) {
      setPendingValues(values);
      setScopeDialogOpen(true);
      return;
    }
    void submit(values, "SINGLE");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>

          {payable && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <p className="text-muted-foreground text-sm">
                  {formatCurrencyBRL(payable.amount)} — não editável
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-supplierId">Fornecedor</Label>
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <SupplierCombobox
                      id="edit-supplierId"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-categoryId">Categoria</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <CategoryCombobox
                      id="edit-categoryId"
                      categories={categories}
                      type="OUT"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Vencimento</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  {...register("dueDate", { required: true })}
                />
                {errors.dueDate && (
                  <p className="text-destructive text-sm">
                    Informe o vencimento.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Observação</Label>
                <Textarea
                  id="edit-description"
                  rows={2}
                  {...register("description")}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateAccountsPayable.isPending}
                >
                  {updateAccountsPayable.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AccountsPayableRecurrenceScopeDialog
        open={scopeDialogOpen}
        onOpenChange={setScopeDialogOpen}
        title="Esta conta pertence a uma recorrência"
        description="Como deseja aplicar esta alteração?"
        singleLabel="Apenas esta conta"
        seriesLabel="Esta conta e todas as próximas"
        isPending={updateAccountsPayable.isPending}
        onConfirm={(scope) => pendingValues && submit(pendingValues, scope)}
      />
    </>
  );
}
