"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useSuppliers } from "./use-suppliers";
import { useSetSupplierActive } from "./use-set-supplier-active";
import { useDeleteSupplier } from "./use-delete-supplier";
import { SupplierDrawer, type SupplierDrawerMode } from "./supplier-drawer";
import { SuppliersTable } from "./suppliers-table";
import { SuppliersCards } from "./suppliers-cards";
import { ApiError } from "@/shared/lib/api-client";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { PageNav } from "@/shared/components/page-nav";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent } from "@/shared/ui/card";
import type { SupplierResponseDTO } from "../application/dtos/supplier.response-dto";

const PAGE_SIZE = 20;

export function SuppliersScreen({ canCreate }: { canCreate: boolean }) {
  const { data: suppliers, isLoading } = useSuppliers();
  const setSupplierActive = useSetSupplierActive();
  const deleteSupplier = useDeleteSupplier();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<SupplierDrawerMode>("create");
  const [drawerTarget, setDrawerTarget] = useState<SupplierResponseDTO | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SupplierResponseDTO | null>(
    null,
  );

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers ?? [];
    return (suppliers ?? []).filter((supplier) => {
      const haystack = [
        supplier.name,
        supplier.document,
        supplier.phone,
        supplier.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [suppliers, search]);

  // Paginação aqui é CLIENT-SIDE de propósito, diferente de Contas a
  // Pagar (que pagina no servidor): `useSuppliers()` já carrega a lista
  // inteira de beneficiários de uma vez só, porque o Combobox de
  // beneficiário (cadastro de Conta a Pagar) e a resolução de nome por
  // id na própria tela de Contas a Pagar dependem dela estar completa
  // — não dá pra paginar o endpoint sem quebrar os dois. Como o volume
  // de beneficiários por clínica é de dezenas/centenas (não cresce sem
  // limite como Contas a Pagar), fatiar em memória aqui é suficiente. Se
  // esse volume um dia explodir, aí sim vale migrar `/api/suppliers`
  // para paginação real no servidor (como Contas a Pagar já faz) — quem
  // mexer aqui deve entender esse motivo antes de "consertar".
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSuppliers.length / PAGE_SIZE),
  );
  const paginatedSuppliers = filteredSuppliers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  function openCreate() {
    setDrawerTarget(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  }

  function openEdit(supplier: SupplierResponseDTO) {
    setDrawerTarget(supplier);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  function openDuplicate(supplier: SupplierResponseDTO) {
    setDrawerTarget(supplier);
    setDrawerMode("duplicate");
    setDrawerOpen(true);
  }

  async function handleToggleActive(supplier: SupplierResponseDTO) {
    try {
      await setSupplierActive.mutateAsync({
        supplierId: supplier.id,
        active: !supplier.active,
      });
      toast.success(
        supplier.active ? "Beneficiário inativado." : "Beneficiário reativado.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível atualizar o status do beneficiário.",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSupplier.mutateAsync(deleteTarget.id);
      toast.success("Beneficiário removido com sucesso.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir o beneficiário.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar beneficiário..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {canCreate && (
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo Beneficiário
          </Button>
        )}
      </div>

      {!isLoading && suppliers && (
        <p className="text-muted-foreground text-sm">
          {suppliers.length} cadastrado{suppliers.length === 1 ? "" : "s"}
        </p>
      )}

      <Card>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {!isLoading && filteredSuppliers.length === 0 && (
            <EmptyState
              icon={Building2}
              title={
                search.trim()
                  ? "Nenhum beneficiário encontrado."
                  : "Nenhum beneficiário cadastrado."
              }
              description={
                search.trim()
                  ? "Tente buscar por outro nome, documento, telefone ou e-mail."
                  : 'Clique em "Novo Beneficiário" para criar o primeiro cadastro.'
              }
            />
          )}

          {!isLoading && filteredSuppliers.length > 0 && (
            <>
              {isMobile ? (
                <SuppliersCards
                  suppliers={paginatedSuppliers}
                  onSelect={canCreate ? openEdit : undefined}
                />
              ) : (
                <SuppliersTable
                  suppliers={paginatedSuppliers}
                  canEdit={canCreate}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onToggleActive={handleToggleActive}
                  onDeleteRequest={setDeleteTarget}
                />
              )}

              {totalPages > 1 &&
                (isMobile ? (
                  <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-sm">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + 1}–
                      {Math.min(page * PAGE_SIZE, filteredSuppliers.length)} de{" "}
                      {filteredSuppliers.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
                    <span className="text-muted-foreground">
                      Mostrando {(page - 1) * PAGE_SIZE + 1} a{" "}
                      {Math.min(page * PAGE_SIZE, filteredSuppliers.length)} de{" "}
                      {filteredSuppliers.length} beneficiário(s)
                    </span>
                    <PageNav
                      page={page}
                      totalPages={totalPages}
                      onChange={setPage}
                    />
                  </div>
                ))}
            </>
          )}
        </CardContent>
      </Card>

      <SupplierDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        supplier={drawerTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Beneficiário"
        description="Deseja realmente excluir este beneficiário?"
        confirmLabel="Excluir"
        pendingLabel="Excluindo..."
        isPending={deleteSupplier.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
