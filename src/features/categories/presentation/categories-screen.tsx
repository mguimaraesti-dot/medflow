"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "./use-categories";
import { useCreateCategory } from "./use-create-category";
import { useDeleteCategory } from "./use-delete-category";
import { useCategoryFormState } from "./use-category-form-state";
import { CategoryColorPicker } from "./category-color-picker";
import { CategoriesTable } from "./categories-table";
import { CategoriesCards } from "./categories-cards";
import { CategoryCreateSheet } from "./category-create-sheet";
import { CategoryEditDialog } from "./category-edit-dialog";
import { CategoryDeleteBlockedDialog } from "./category-delete-blocked-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { FilterChipGroup } from "@/shared/components/mobile-filter-sheet";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
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
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CategoryType | undefined>(
    undefined,
  );
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingTarget, setEditingTarget] =
    useState<CategoryResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponseDTO | null>(
    null,
  );
  const [blockedTarget, setBlockedTarget] =
    useState<CategoryResponseDTO | null>(null);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (categories ?? []).filter((category) => {
      if (typeFilter && category.type !== typeFilter) return false;
      if (!term) return true;
      const typeLabel = category.type === "IN" ? "entrada" : "saída";
      return (
        category.name.toLowerCase().includes(term) || typeLabel.includes(term)
      );
    });
  }, [categories, search, typeFilter]);

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
    <div className={cn("space-y-4", isMobile && "pb-20")}>
      {canCreate && !isMobile && (
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

      {isMobile && categories && (
        <p className="text-muted-foreground text-sm">
          {categories.length} cadastrada{categories.length === 1 ? "" : "s"}
        </p>
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

      {isMobile && (
        <FilterChipGroup
          options={[
            { value: "IN", label: "Entradas" },
            { value: "OUT", label: "Saídas" },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      )}

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

          {!isLoading &&
            filteredCategories.length > 0 &&
            (isMobile ? (
              <CategoriesCards
                categories={filteredCategories}
                canEdit={canCreate}
                onEdit={setEditingTarget}
                onDeleteRequest={handleDeleteRequest}
              />
            ) : (
              <CategoriesTable
                categories={filteredCategories}
                canEdit={canCreate}
                onEdit={setEditingTarget}
                onDeleteRequest={handleDeleteRequest}
              />
            ))}
        </CardContent>
      </Card>

      {isMobile && canCreate && (
        <Button
          type="button"
          size="icon"
          className="fixed right-5 bottom-5 z-20 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setCreateSheetOpen(true)}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Nova Categoria</span>
        </Button>
      )}

      <CategoryCreateSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
      />

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
