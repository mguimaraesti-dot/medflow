"use client";

import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useSuppliers } from "./use-suppliers";
import { useCreateSupplier } from "./use-create-supplier";
import {
  SupplierFormFields,
  useSupplierFormState,
} from "./supplier-form-fields";
import { ApiError } from "@/shared/lib/api-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export function SuppliersScreen({ canCreate }: { canCreate: boolean }) {
  const form = useSupplierFormState();
  const { data: suppliers, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();

  async function handleCreate() {
    try {
      await createSupplier.mutateAsync({
        name: form.name,
        personType: form.personType,
        document: form.document.trim() || undefined,
        phone: form.phone,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      form.reset();
      toast.success("Beneficiário cadastrado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cadastrar o beneficiário.",
      );
    }
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Beneficiário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SupplierFormFields state={form} idPrefix="new-supplier" />
            <Button
              type="button"
              disabled={!form.isValid || createSupplier.isPending}
              onClick={handleCreate}
            >
              {createSupplier.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Beneficiários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {!isLoading && suppliers && suppliers.length === 0 && (
            <EmptyState
              icon={Building2}
              title="Nenhum beneficiário cadastrado."
              description="Os beneficiários cadastrados aparecem aqui."
            />
          )}

          {!isLoading && suppliers && suppliers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {supplier.document ?? "—"}
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
