"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { ApiError } from "@/shared/lib/api-client";
import {
  SupplierFormFields,
  useSupplierFormState,
} from "./supplier-form-fields";
import { useCreateSupplier } from "./use-create-supplier";
import { useUpdateSupplier } from "./use-update-supplier";
import type { SupplierResponseDTO } from "../application/dtos/supplier.response-dto";

export type SupplierDrawerMode = "create" | "edit" | "duplicate";

/**
 * Um único Drawer pros 3 fluxos (Novo/Editar/Duplicar) — nunca um
 * formulário fixo ocupando a tela (Refinamento UX/UI Beneficiários).
 * "Duplicar" pré-preenche os campos de um beneficiário existente mas
 * sempre cria um registro novo (nunca `PATCH` no original).
 */
export function SupplierDrawer({
  open,
  onOpenChange,
  mode,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SupplierDrawerMode;
  /** `null` só em modo "create". Editar/Duplicar sempre têm um beneficiário de origem. */
  supplier: SupplierResponseDTO | null;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useSupplierFormState();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isPending = createSupplier.isPending || updateSupplier.isPending;

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    if (mode === "create") {
      form.reset();
      return;
    }
    if (supplier) {
      form.reset({
        name: supplier.name,
        personType: supplier.personType,
        document: supplier.document ?? "",
        phone: supplier.phone ?? "",
        email: supplier.email ?? "",
        notes: supplier.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, supplier?.id]);

  const title =
    mode === "edit"
      ? "Editar Beneficiário"
      : mode === "duplicate"
        ? "Duplicar Beneficiário"
        : "Novo Beneficiário";

  async function handleSubmit() {
    setServerError(null);
    const payload = {
      name: form.name,
      personType: form.personType,
      document: form.document.trim() || undefined,
      phone: form.phone,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (mode === "edit" && supplier) {
        await updateSupplier.mutateAsync({
          supplierId: supplier.id,
          input: payload,
        });
        toast.success("Beneficiário atualizado com sucesso.");
      } else {
        await createSupplier.mutateAsync(payload);
        toast.success("Beneficiário cadastrado com sucesso.");
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar o beneficiário.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Beneficiários são fornecedores, prestadores ou funcionários que
            recebem pagamentos da clínica.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <SupplierFormFields state={form} idPrefix="drawer-supplier" />

          {serverError && (
            <p className="text-destructive mt-4 text-sm" role="alert">
              {serverError}
            </p>
          )}
        </div>

        <SheetFooter className="border-t">
          <Button
            type="button"
            disabled={!form.isValid || isPending}
            onClick={handleSubmit}
            className="h-12 text-base font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Beneficiário"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
