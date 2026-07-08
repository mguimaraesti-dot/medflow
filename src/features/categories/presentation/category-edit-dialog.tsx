"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ApiError } from "@/shared/lib/api-client";
import { useUpdateCategory } from "./use-update-category";
import { useCategoryFormState } from "./use-category-form-state";
import { CategoryColorPicker } from "./category-color-picker";
import type { CategoryType } from "../domain/category.entity";
import type { CategoryResponseDTO } from "../application/dtos/category.response-dto";

export function CategoryEditDialog({
  category,
  open,
  onOpenChange,
}: {
  category: CategoryResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useCategoryFormState();
  const updateCategory = useUpdateCategory();

  useEffect(() => {
    if (!open || !category) return;
    setServerError(null);
    form.reset({
      name: category.name,
      type: category.type,
      color: category.color,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id]);

  async function handleSubmit() {
    if (!category) return;
    setServerError(null);

    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        input: { name: form.name.trim(), type: form.type, color: form.color },
      });
      toast.success("Categoria atualizada com sucesso.");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível atualizar a categoria.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-category-name">
              Nome
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            </Label>
            <Input
              id="edit-category-name"
              value={form.name}
              onChange={(event) => form.setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category-type">
              Tipo
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            </Label>
            <Select
              value={form.type}
              onValueChange={(value) => form.setType(value as CategoryType)}
            >
              <SelectTrigger id="edit-category-type" className="w-full">
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
              value={form.color}
              onChange={form.setColor}
              idPrefix="edit-category"
            />
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}
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
            type="button"
            disabled={!form.isValid || updateCategory.isPending}
            onClick={handleSubmit}
          >
            {updateCategory.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
