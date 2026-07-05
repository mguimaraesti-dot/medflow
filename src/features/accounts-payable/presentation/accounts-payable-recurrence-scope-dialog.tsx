"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";

export type RecurrenceScope = "SINGLE" | "SERIES";

/**
 * Diálogo genérico de escopo — reaproveitado por editar ("Apenas esta
 * conta" / "Esta conta e todas as próximas") e cancelar ("Apenas esta
 * conta" / "Encerrar recorrência"). Só aparece quando a conta pertence a
 * uma recorrência.
 */
export function AccountsPayableRecurrenceScopeDialog({
  open,
  onOpenChange,
  title,
  description,
  singleLabel,
  seriesLabel,
  confirmLabel = "Confirmar",
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  singleLabel: string;
  seriesLabel: string;
  confirmLabel?: string;
  onConfirm: (scope: RecurrenceScope) => void;
  isPending?: boolean;
}) {
  const [scope, setScope] = useState<RecurrenceScope>("SINGLE");

  useEffect(() => {
    if (open) setScope("SINGLE");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={scope}
          onValueChange={(value) => setScope(value as RecurrenceScope)}
          className="gap-3"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="SINGLE" />
            {singleLabel}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="SERIES" />
            {seriesLabel}
          </label>
        </RadioGroup>

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
            disabled={isPending}
            onClick={() => onConfirm(scope)}
          >
            {isPending ? "Aplicando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
