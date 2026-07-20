"use client";

import { useEffect, useRef } from "react";
import {
  CashFlowEntryForm,
  type CashFlowEntryFormHandle,
} from "./cash-flow-entry-form";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";

/**
 * "Novo Lançamento" no mobile — mesmo `CashFlowEntryForm` de sempre
 * (mesmos campos, validação e submissão), só que dentro de um bottom
 * sheet em vez de fixo na página (Registrar Entrada/Saída precisa
 * estar sempre a um toque, mas não deve ocupar a tela o tempo todo).
 * `SheetTitle` fica `sr-only` — o próprio form já tem seu
 * `CardTitle` visível ("Novo Lançamento"), então um segundo título
 * visível aqui seria redundante; o `sr-only` só satisfaz a
 * acessibilidade do Radix Dialog por baixo do Sheet.
 */
export function CashFlowEntrySheet({
  open,
  onOpenChange,
  initialType,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType: "IN" | "OUT";
  disabled: boolean;
}) {
  const formRef = useRef<CashFlowEntryFormHandle>(null);

  useEffect(() => {
    if (open) formRef.current?.selectType(initialType);
  }, [open, initialType]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl"
      >
        <SheetTitle className="sr-only">Novo Lançamento</SheetTitle>
        <div className="px-4 pb-4">
          {open && <CashFlowEntryForm ref={formRef} disabled={disabled} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
