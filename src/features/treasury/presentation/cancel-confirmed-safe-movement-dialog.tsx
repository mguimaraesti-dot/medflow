"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useCancelConfirmedSafeMovement } from "./use-cancel-confirmed-safe-movement";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

/**
 * Diferente de `CancelSafeMovementDialog` (rejeita uma conferência
 * `PENDING`, que nunca chegou a afetar o saldo): esta movimentação já
 * está `CONFIRMED` — cancelar aqui reverte um efeito real no saldo do
 * Cofre (e, se for `SANGRIA`, no Dinheiro Esperado do caixa vinculado).
 * A cópia do dialog deixa isso explícito de propósito, para quem for
 * clicar não confundir com um "desfazer sem consequência".
 */
export function CancelConfirmedSafeMovementDialog({
  movement,
  open,
  onOpenChange,
  onCancelled,
}: {
  movement: SafeMovementResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado só quando o cancelamento é confirmado com sucesso — nunca ao só fechar/desistir do dialog. */
  onCancelled?: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancelMovement = useCancelConfirmedSafeMovement();

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
      toast.success(
        "Movimentação cancelada — o saldo do Cofre já reflete a reversão.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cancelar esta movimentação.",
      );
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Cancelar movimentação confirmada"
      description={
        movement
          ? `Isto REVERTE ${formatCurrencyBRL(movement.amount)} do saldo do Cofre — a movimentação já estava confirmada, não é uma pendência. Use para corrigir um lançamento errado (ex.: valor digitado errado). Explique o motivo.`
          : undefined
      }
      confirmLabel="Cancelar movimentação"
      pendingLabel="Cancelando..."
      isPending={cancelMovement.isPending}
      confirmDisabled={!canSubmit}
      onConfirm={handleConfirm}
    >
      <div className="space-y-2">
        <Label htmlFor="cancel-confirmed-safe-movement-reason">Motivo</Label>
        <Textarea
          id="cancel-confirmed-safe-movement-reason"
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
