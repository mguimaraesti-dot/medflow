"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useReverseCashFlowEntry } from "./use-reverse-cash-flow-entry";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function ReverseEntryDialog({
  entryId,
  open,
  onOpenChange,
}: {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [description, setDescription] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const reverseCashFlowEntry = useReverseCashFlowEntry();

  async function onConfirm() {
    if (!entryId) return;
    setServerError(null);
    try {
      await reverseCashFlowEntry.mutateAsync({
        entryId,
        input: { description: description.trim() || undefined },
      });
      onOpenChange(false);
      setDescription("");
      toast.success("Lançamento estornado.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível estornar.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estornar lançamento</DialogTitle>
          <DialogDescription>
            Cria um novo lançamento de sinal oposto, vinculado a este. Esta ação
            não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reverse-description">Descrição (opcional)</Label>
          <Textarea
            id="reverse-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        {serverError && (
          <p className="text-destructive text-sm" role="alert">
            {serverError}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={reverseCashFlowEntry.isPending}
            onClick={onConfirm}
          >
            {reverseCashFlowEntry.isPending
              ? "Estornando..."
              : "Confirmar estorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
