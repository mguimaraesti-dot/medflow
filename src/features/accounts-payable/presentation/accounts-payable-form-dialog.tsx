"use client";

import {
  AccountsPayableForm,
  type AccountsPayableFormValues,
} from "./accounts-payable-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function AccountsPayableFormDialog({
  open,
  onOpenChange,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<AccountsPayableFormValues>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova conta a pagar</DialogTitle>
        </DialogHeader>
        {/* Remonta a cada abertura — garante defaultValues frescos (útil pro "Duplicar"). */}
        {open && (
          <AccountsPayableForm
            initialValues={initialValues}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
