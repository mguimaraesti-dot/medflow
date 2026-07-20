"use client";

import { toast } from "sonner";
import { useCreateCategory } from "./use-create-category";
import { useCategoryFormState } from "./use-category-form-state";
import { CategoryColorPicker } from "./category-color-picker";
import { CategoryTypeSegmented } from "./category-type-segmented";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

/**
 * Cadastro de categoria no mobile — bottom sheet aberto pelo FAB "＋
 * Nova Categoria" em vez do formulário fixo no topo (que empurrava a
 * lista pra baixo). Mesmos campos/validação/use-case do formulário
 * desktop (`useCategoryFormState` + `useCreateCategory`), só o "onde"
 * muda; Tipo vira segmented aqui (só 2 opções).
 */
export function CategoryCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useCategoryFormState();
  const createCategory = useCreateCategory();

  async function handleSubmit() {
    try {
      await createCategory.mutateAsync({
        name: form.name.trim(),
        type: form.type,
        color: form.color,
      });
      toast.success("Categoria cadastrada com sucesso.");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cadastrar a categoria.",
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Nova Categoria</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="mobile-new-category-name">
              Nome
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            </Label>
            <Input
              id="mobile-new-category-name"
              value={form.name}
              onChange={(event) => form.setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Tipo
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            </Label>
            <CategoryTypeSegmented value={form.type} onChange={form.setType} />
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
              idPrefix="mobile-new-category"
            />
          </div>
        </div>

        <SheetFooter>
          <Button
            type="button"
            className="w-full"
            disabled={!form.isValid || createCategory.isPending}
            onClick={handleSubmit}
          >
            {createCategory.isPending ? "Salvando..." : "Cadastrar categoria"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
