"use client";

import { useState } from "react";
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
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { ApiError } from "@/shared/lib/api-client";
import { useDeleteAccountsPayable } from "./use-delete-accounts-payable";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/**
 * Três variações, conforme o status da conta (regra de negócio — nunca
 * exclusão imediata, sempre confirmação):
 * - PENDING/OVERDUE: confirmação real de soft delete.
 * - PAID: bloqueio explicativo (integridade do histórico financeiro).
 * - CANCELLED: bloqueio explicativo (registro histórico).
 */
export function DeleteAccountsPayableDialog({
  payable,
  open,
  onOpenChange,
  onDeleted,
}: {
  payable: AccountsPayableResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado só quando a exclusão é confirmada com sucesso (diferente de um simples cancelar/fechar). */
  onDeleted?: () => void;
}) {
  const [reason, setReason] = useState("");
  const deleteAccountsPayable = useDeleteAccountsPayable();

  if (!payable) return null;

  if (payable.status === "PAID") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não é possível excluir</AlertDialogTitle>
            <AlertDialogDescription>
              Contas pagas não podem ser excluídas para preservar a integridade
              do histórico financeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar Conta
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (payable.status === "CANCELLED") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não é possível excluir</AlertDialogTitle>
            <AlertDialogDescription>
              Contas canceladas não podem ser excluídas. Elas permanecem apenas
              para consulta histórica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  async function handleDelete() {
    if (!payable) return;
    try {
      await deleteAccountsPayable.mutateAsync({
        accountsPayableId: payable.id,
        reason: reason.trim() || undefined,
      });
      toast.success("Conta excluída.");
      setReason("");
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível excluir.",
      );
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Esta conta será removida da listagem principal.</p>
              <p>
                Ela permanecerá armazenada para fins de auditoria e poderá ser
                restaurada posteriormente.
              </p>
              <p>Deseja continuar?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          placeholder="Motivo da exclusão (opcional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
        />

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setReason("")}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteAccountsPayable.isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            {deleteAccountsPayable.isPending ? "Excluindo..." : "Excluir Conta"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
