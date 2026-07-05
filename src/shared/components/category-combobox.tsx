"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { getCategoryIcon } from "@/shared/lib/lucide-icon-map";
import { useCreateCategory } from "@/features/categories/presentation/use-create-category";
import { ApiError } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type {
  Category,
  CategoryType,
} from "@/features/categories/domain/category.entity";

/** Mesma paleta usada no seed (prisma/seed-data.ts) — mantém consistência visual. */
const COLOR_PRESETS = [
  "#16A34A",
  "#0EA5E9",
  "#6366F1",
  "#DC2626",
  "#F59E0B",
  "#7C3AED",
  "#DB2777",
  "#64748B",
];

export function CategoryCombobox({
  categories,
  type,
  value,
  onChange,
  disabled,
  id,
}: {
  categories: Category[] | undefined;
  type: CategoryType;
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [error, setError] = useState<string | null>(null);

  const createCategory = useCreateCategory();
  const selected = categories?.find((category) => category.id === value);
  const SelectedIcon = getCategoryIcon(selected?.icon);

  async function handleCreate() {
    setError(null);
    try {
      const created = await createCategory.mutateAsync({ name, type, color });
      onChange(created.id);
      setCreateOpen(false);
      setOpen(false);
      setName("");
      setColor(COLOR_PRESETS[0]);
    } catch (createError) {
      setError(
        createError instanceof ApiError
          ? createError.message
          : "Não foi possível cadastrar a categoria.",
      );
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="flex items-center gap-2">
                <SelectedIcon
                  className="h-4 w-4"
                  style={{ color: selected.color }}
                />
                {selected.name}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Selecione a categoria
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar categoria..." />
            <CommandList>
              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
              <CommandGroup>
                {categories?.map((category) => {
                  const Icon = getCategoryIcon(category.icon);
                  return (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => {
                        onChange(category.id);
                        setOpen(false);
                      }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: category.color }}
                      />
                      {category.name}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          category.id === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar nova categoria
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-label={`Cor ${preset}`}
                    onClick={() => setColor(preset)}
                    className={cn(
                      "h-7 w-7 rounded-full ring-offset-2 transition-shadow",
                      color === preset && "ring-ring ring-2",
                    )}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={!name.trim() || createCategory.isPending}
              onClick={handleCreate}
            >
              {createCategory.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
