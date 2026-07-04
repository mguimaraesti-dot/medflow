"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { getCategoryIcon } from "@/shared/lib/lucide-icon-map";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import type { Category } from "@/features/categories/domain/category.entity";

export function CategoryCombobox({
  categories,
  value,
  onChange,
  disabled,
  id,
}: {
  categories: Category[] | undefined;
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories?.find((category) => category.id === value);
  const SelectedIcon = getCategoryIcon(selected?.icon);

  return (
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
            <span className="text-muted-foreground">Selecione a categoria</span>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
