"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createRecurringBillSchema } from "../application/dtos/create-recurring-bill.dto";
import type { CreateRecurringBillInput } from "../application/dtos/create-recurring-bill.dto";
import { useRecurringBills } from "./use-recurring-bills";
import { useCreateRecurringBill } from "./use-create-recurring-bill";
import { useDeactivateRecurringBill } from "./use-deactivate-recurring-bill";
import { SupplierCombobox } from "@/shared/components/supplier-combobox";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { CategoryCombobox } from "@/shared/components/category-combobox";
import { CurrencyInput } from "@/shared/components/currency-input";
import { EmptyState } from "@/shared/components/empty-state";
import { ApiError } from "@/shared/lib/api-client";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { RefreshCw } from "lucide-react";

const emptyValues: CreateRecurringBillInput = {
  supplierId: "",
  categoryId: "",
  description: "",
  amount: 0,
  dueDay: 1,
};

export function RecurringBillsPanel() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: bills } = useRecurringBills();
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories("OUT");
  const createRecurringBill = useCreateRecurringBill();
  const deactivateRecurringBill = useDeactivateRecurringBill();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRecurringBillInput>({
    resolver: zodResolver(createRecurringBillSchema),
    defaultValues: emptyValues,
  });

  const supplierById = new Map(suppliers?.map((s) => [s.id, s]));

  async function onSubmit(values: CreateRecurringBillInput) {
    setServerError(null);
    try {
      await createRecurringBill.mutateAsync(values);
      reset(emptyValues);
      toast.success("Recorrência cadastrada.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível cadastrar a recorrência.";
      setServerError(message);
      toast.error(message);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateRecurringBill.mutateAsync(id);
      toast.success("Recorrência inativada.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível inativar.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova recorrência</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="recurring-supplierId">Fornecedor</Label>
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <SupplierCombobox
                    id="recurring-supplierId"
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
              <Label htmlFor="recurring-categoryId">Categoria</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CategoryCombobox
                    id="recurring-categoryId"
                    categories={categories}
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

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recurring-description">Descrição</Label>
              <Input id="recurring-description" {...register("description")} />
              {errors.description && (
                <p className="text-destructive text-sm">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-amount">Valor</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput
                    id="recurring-amount"
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
              <Label htmlFor="recurring-dueDay">Dia do vencimento</Label>
              <Input
                id="recurring-dueDay"
                type="number"
                min={1}
                max={28}
                {...register("dueDay", { valueAsNumber: true })}
              />
              {errors.dueDay && (
                <p className="text-destructive text-sm">
                  {errors.dueDay.message}
                </p>
              )}
            </div>

            {serverError && (
              <p
                className="text-destructive text-sm sm:col-span-2"
                role="alert"
              >
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              disabled={createRecurringBill.isPending}
              className="sm:col-span-2"
            >
              {createRecurringBill.isPending
                ? "Salvando..."
                : "Cadastrar recorrência"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recorrências ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {(!bills || bills.length === 0) && (
            <EmptyState
              icon={RefreshCw}
              title="Nenhuma recorrência cadastrada."
              description="Regras de despesas mensais (aluguel, softwares) aparecem aqui."
            />
          )}

          {bills && bills.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.dueDay}</TableCell>
                    <TableCell>
                      {supplierById.get(bill.supplierId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bill.description}
                    </TableCell>
                    <TableCell>{formatCurrencyBRL(bill.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(bill.id)}
                      >
                        Inativar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
