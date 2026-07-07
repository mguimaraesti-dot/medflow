"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { useEndRecurringBill } from "./use-end-recurring-bill";

/**
 * Encerramento direto da recorrência (botão do Card, não passa pelo fluxo de
 * cancelar conta) — só desativa; as ocorrências já geradas permanecem
 * intactas.
 */
export function EndRecurringBillDialog({
  recurringBillId,
  open,
  onOpenChange,
}: {
  recurringBillId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deactivateRecurringBill = useEndRecurringBill();

  async function handleConfirm() {
    try {
      await deactivateRecurringBill.mutateAsync(recurringBillId);
      toast.success("Recorrência encerrada.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível encerrar a recorrência.",
      );
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Encerrar recorrência"
      confirmLabel="Encerrar recorrência"
      pendingLabel="Encerrando..."
      isPending={deactivateRecurringBill.isPending}
      onConfirm={() => void handleConfirm()}
    />
  );
}
