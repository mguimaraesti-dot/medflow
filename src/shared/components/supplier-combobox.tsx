"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCreateSupplier } from "@/features/suppliers/presentation/use-create-supplier";
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
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers } = useSuppliers();
  const createSupplier = useCreateSupplier();

  const selected = suppliers?.find((supplier) => supplier.id === value);

  async function handleCreate() {
    setError(null);
    try {
      const created = await createSupplier.mutateAsync({
        name,
        contactName: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onChange(created.id);
      setCreateOpen(false);
      setOpen(false);
      setName("");
      setContactName("");
      setPhone("");
    } catch (createError) {
      setError(
        createError instanceof ApiError
          ? createError.message
          : "Não foi possível cadastrar o fornecedor.",
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
                Selecione o fornecedor
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar fornecedor..." />
            <CommandList>
              <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
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
                  Cadastrar novo fornecedor
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Nome</Label>
              <Input
                id="supplier-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-contact-name">
                  Contato (opcional)
                </Label>
                <Input
                  id="supplier-contact-name"
                  placeholder="Nome da pessoa de contato"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Telefone (opcional)</Label>
                <Input
                  id="supplier-phone"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
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
              disabled={!name.trim() || createSupplier.isPending}
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
