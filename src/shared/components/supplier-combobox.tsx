"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCreateSupplier } from "@/features/suppliers/presentation/use-create-supplier";
import {
  SupplierFormFields,
  useSupplierFormState,
} from "@/features/suppliers/presentation/supplier-form-fields";
import { ApiError } from "@/shared/lib/api-client";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function SupplierCombobox({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (supplierId: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useSupplierFormState();

  const { data: suppliers } = useSuppliers();
  const createSupplier = useCreateSupplier();

  const selected = suppliers?.find((supplier) => supplier.id === value);

  async function handleCreate() {
    setError(null);
    try {
      const created = await createSupplier.mutateAsync({
        name: form.name,
        personType: form.personType,
        document: form.document.trim() || undefined,
        phone: form.phone,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      onChange(created.id);
      setCreateOpen(false);
      setOpen(false);
      form.reset();
    } catch (createError) {
      setError(
        createError instanceof ApiError
          ? createError.message
          : "Não foi possível cadastrar o beneficiário.",
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
              selected.name
            ) : (
              <span className="text-muted-foreground">
                Selecione um beneficiário...
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar beneficiário..." />
            <CommandList>
              <CommandEmpty>Nenhum beneficiário encontrado.</CommandEmpty>
              <CommandGroup>
                {suppliers?.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.name}
                    onSelect={() => {
                      onChange(supplier.id);
                      setOpen(false);
                    }}
                  >
                    {supplier.name}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        supplier.id === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar novo beneficiário
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Beneficiário</DialogTitle>
          </DialogHeader>
          <SupplierFormFields state={form} idPrefix="combobox-supplier" />
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              disabled={!form.isValid || createSupplier.isPending}
              onClick={handleCreate}
            >
              {createSupplier.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
