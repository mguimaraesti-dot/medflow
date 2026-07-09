"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { useConfirmSafeMovement } from "./use-confirm-safe-movement";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

export function ConfirmSafeMovementDialog({
  movement,
  open,
  onOpenChange,
  onConfirmed,
}: {
  movement: SafeMovementResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado só quando a conferência é confirmada com sucesso — nunca ao só fechar/cancelar o dialog. */
  onConfirmed?: () => void;
}) {
  const confirmMovement = useConfirmSafeMovement();

  async function handleConfirm() {
    if (!movement) return;
    try {
      await confirmMovement.mutateAsync(movement.id);
      onOpenChange(false);
      onConfirmed?.();
      toast.success("Conferência confirmada. Saldo do Cofre atualizado.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível confirmar a conferência.",
      );
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirmar recebimento"
      description={
        movement
          ? `Confirma que o Cofre recebeu ${formatCurrencyBRL(movement.amount)} do fechamento da Recepção? O saldo do Cofre será atualizado.`
          : undefined
      }
      confirmLabel="Confirmar recebimento"
      pendingLabel="Confirmando..."
      isPending={confirmMovement.isPending}
      destructive={false}
      onConfirm={handleConfirm}
    />
  );
}
