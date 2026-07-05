"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useSuppliers } from "./use-suppliers";
import { useCreateSupplier } from "./use-create-supplier";
import { ApiError } from "@/shared/lib/api-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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
  const [name, setName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const { data: suppliers, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();

  async function handleCreate() {
    try {
      await createSupplier.mutateAsync({
        name,
        document: documentNumber.trim() || undefined,
      });
      setName("");
      setDocumentNumber("");
      toast.success("Fornecedor cadastrado.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cadastrar o fornecedor.",
      );
    }
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Novo fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Nome</Label>
                <Input
                  id="supplier-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-document">CPF/CNPJ (opcional)</Label>
                <Input
                  id="supplier-document"
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={!name.trim() || createSupplier.isPending}
                onClick={handleCreate}
              >
                {createSupplier.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fornecedores</CardTitle>
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
              title="Nenhum fornecedor cadastrado."
              description="Os fornecedores cadastrados aparecem aqui."
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
