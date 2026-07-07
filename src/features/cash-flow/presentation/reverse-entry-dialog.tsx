"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  reverseCashFlowEntrySchema,
  type ReverseCashFlowEntryInput,
} from "../application/dtos/reverse-cash-flow-entry.dto";
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
  const [serverError, setServerError] = useState<string | null>(null);
  const reverseCashFlowEntry = useReverseCashFlowEntry();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReverseCashFlowEntryInput>({
    resolver: zodResolver(reverseCashFlowEntrySchema),
  });

  async function onSubmit(values: ReverseCashFlowEntryInput) {
    if (!entryId) return;
    setServerError(null);
    try {
      await reverseCashFlowEntry.mutateAsync({ entryId, input: values });
      onOpenChange(false);
      reset();
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Estornar lançamento</DialogTitle>
            <DialogDescription>
              Cria um novo lançamento de sinal oposto, vinculado a este. Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reverse-description">Justificativa</Label>
            <Textarea
              id="reverse-description"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-destructive text-sm">
                {errors.description.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              variant="destructive"
              disabled={reverseCashFlowEntry.isPending}
            >
              {reverseCashFlowEntry.isPending
                ? "Estornando..."
                : "Confirmar estorno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
