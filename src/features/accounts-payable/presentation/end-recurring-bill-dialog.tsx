"use client";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { useEndRecurringBill } from "./use-end-recurring-bill";

/**
 * Encerramento direto da recorrência (botão do Card, não passa pelo fluxo de
 * cancelar conta) — só desativa; as ocorrências já geradas permanecem
 * intactas ("as contas já existentes permanecerão disponíveis").
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar Recorrência</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Nenhuma nova conta será gerada.</p>
              <p>As contas já existentes permanecerão disponíveis.</p>
              <p>Deseja continuar?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deactivateRecurringBill.isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
          >
            {deactivateRecurringBill.isPending
              ? "Encerrando..."
              : "Encerrar Recorrência"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
