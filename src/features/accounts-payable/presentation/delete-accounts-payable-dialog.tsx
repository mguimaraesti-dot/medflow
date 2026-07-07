"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Textarea } from "@/shared/ui/textarea";
import { ApiError } from "@/shared/lib/api-client";
import { useDeleteAccountsPayable } from "./use-delete-accounts-payable";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/**
 * Confirmação de soft delete — só é aberto por um gatilho já restrito a
 * contas PENDENTES (tabela/Drawer nunca mostram "Excluir" fora desse
 * status), então não precisa mais tratar PAID/CANCELLED aqui. O backend
 * (`softDeleteAccountsPayableUseCase`) continua validando de qualquer forma.
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
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir conta"
      confirmLabel="Excluir conta"
      pendingLabel="Excluindo..."
      isPending={deleteAccountsPayable.isPending}
      onConfirm={() => void handleDelete()}
      onCancel={() => setReason("")}
    >
      <Textarea
        placeholder="Motivo da exclusão (opcional)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
      />
    </ConfirmDialog>
  );
}
