"use client";

import { useMemo, useState } from "react";
import { Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "./use-categories";
import { useCreateCategory } from "./use-create-category";
import { useDeleteCategory } from "./use-delete-category";
import { useCategoryFormState } from "./use-category-form-state";
import { CategoryColorPicker } from "./category-color-picker";
import { CategoriesTable } from "./categories-table";
import { CategoryEditDialog } from "./category-edit-dialog";
import { CategoryDeleteBlockedDialog } from "./category-delete-blocked-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { CategoryType } from "../domain/category.entity";
import type { CategoryResponseDTO } from "../application/dtos/category.response-dto";

export function CategoriesScreen({ canCreate }: { canCreate: boolean }) {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const createForm = useCategoryFormState();

  const [search, setSearch] = useState("");
  const [editingTarget, setEditingTarget] =
    useState<CategoryResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponseDTO | null>(
    null,
  );
  const [blockedTarget, setBlockedTarget] =
    useState<CategoryResponseDTO | null>(null);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories ?? [];
    return (categories ?? []).filter((category) => {
      const typeLabel = category.type === "IN" ? "entrada" : "saída";
      return (
        category.name.toLowerCase().includes(term) || typeLabel.includes(term)
      );
    });
  }, [categories, search]);

  async function handleCreate() {
    try {
      await createCategory.mutateAsync({
        name: createForm.name.trim(),
        type: createForm.type,
        color: createForm.color,
      });
      createForm.reset();
      toast.success("Categoria cadastrada com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cadastrar a categoria.",
      );
    }
  }

  function handleDeleteRequest(category: CategoryResponseDTO) {
    if (category.linkedRecordsCount > 0) {
      setBlockedTarget(category);
      return;
    }
    setDeleteTarget(category);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast.success("Categoria excluída com sucesso.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir a categoria.",
      );
    }
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full space-y-2 sm:max-w-xs">
                <Label htmlFor="new-category-name">
                  Nome da categoria
                  <span className="text-destructive" aria-hidden>
                    {" "}
                    *
                  </span>
                </Label>
                <Input
                  id="new-category-name"
                  value={createForm.name}
                  onChange={(event) => createForm.setName(event.target.value)}
                />
              </div>
              <div className="w-full space-y-2 sm:w-[160px]">
                <Label htmlFor="new-category-type">
                  Tipo
                  <span className="text-destructive" aria-hidden>
                    {" "}
                    *
                  </span>
                </Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value) =>
                    createForm.setType(value as CategoryType)
                  }
                >
                  <SelectTrigger id="new-category-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Entrada</SelectItem>
                    <SelectItem value="OUT">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Cor
                  <span className="text-destructive" aria-hidden>
                    {" "}
                    *
                  </span>
                </Label>
                <CategoryColorPicker
                  value={createForm.color}
                  onChange={createForm.setColor}
                  idPrefix="new-category"
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={!createForm.isValid || createCategory.isPending}
              onClick={handleCreate}
              className="shrink-0"
            >
              {createCategory.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar categoria..."
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Card>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {!isLoading && filteredCategories.length === 0 && (
            <EmptyState
              icon={Tags}
              title={
                search.trim()
                  ? "Nenhuma categoria encontrada."
                  : "Nenhuma categoria cadastrada."
              }
              description={
                search.trim()
                  ? "Tente buscar por outro nome ou tipo."
                  : 'Clique em "Cadastrar" para criar sua primeira categoria.'
              }
            />
          )}

          {!isLoading && filteredCategories.length > 0 && (
            <CategoriesTable
              categories={filteredCategories}
              canEdit={canCreate}
              onEdit={setEditingTarget}
              onDeleteRequest={handleDeleteRequest}
            />
          )}
        </CardContent>
      </Card>

      <CategoryEditDialog
        category={editingTarget}
        open={editingTarget !== null}
        onOpenChange={(open) => !open && setEditingTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Categoria"
        description="Deseja realmente excluir esta categoria?"
        confirmLabel="Excluir Categoria"
        pendingLabel="Excluindo..."
        isPending={deleteCategory.isPending}
        onConfirm={handleConfirmDelete}
      />

      <CategoryDeleteBlockedDialog
        open={blockedTarget !== null}
        onOpenChange={(open) => !open && setBlockedTarget(null)}
        linkedRecordsCount={blockedTarget?.linkedRecordsCount ?? 0}
      />
    </div>
  );
}
