"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useCancelSafeMovement } from "./use-cancel-safe-movement";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export function CancelSafeMovementDialog({
  movement,
  open,
  onOpenChange,
  onCancelled,
}: {
  movement: SafeMovementResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado só quando a rejeição é confirmada com sucesso — nunca ao só fechar/desistir do dialog. */
  onCancelled?: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancelMovement = useCancelSafeMovement();

  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < 10;
  const canSubmit = reason.trim().length >= 10;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setReason("");
  }

  async function handleConfirm() {
    if (!movement || !canSubmit) return;
    try {
      await cancelMovement.mutateAsync({
        safeMovementId: movement.id,
        input: { reason: reason.trim() },
      });
      handleOpenChange(false);
      onCancelled?.();
      toast.success("Conferência rejeitada.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível rejeitar a conferência.",
      );
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Rejeitar conferência"
      description={
        movement
          ? `O valor de ${formatCurrencyBRL(movement.amount)} não entrará no saldo do Cofre. Explique o motivo.`
          : undefined
      }
      confirmLabel="Rejeitar conferência"
      pendingLabel="Rejeitando..."
      isPending={cancelMovement.isPending}
      confirmDisabled={!canSubmit}
      onConfirm={handleConfirm}
    >
      <div className="space-y-2">
        <Label htmlFor="cancel-safe-movement-reason">Motivo</Label>
        <Textarea
          id="cancel-safe-movement-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {reasonTooShort && (
          <p className="text-destructive text-sm">
            O motivo precisa ter pelo menos 10 caracteres.
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}
