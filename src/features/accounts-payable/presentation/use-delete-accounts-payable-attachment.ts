"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export function useDeleteAccountsPayableAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountsPayableId,
      attachmentId,
    }: {
      accountsPayableId: string;
      attachmentId: string;
    }) =>
      apiFetch<{ success: boolean }>(
        `/api/accounts-payable/${accountsPayableId}/attachments/${attachmentId}`,
        { method: "DELETE" },
      ),
    onSuccess: (_data, { accountsPayableId }) => {
      queryClient.invalidateQueries({
        queryKey: ["accounts-payable-attachments", accountsPayableId],
      });
      // Mesmo motivo do upload — mantém a contagem da coluna "Documentos" em dia.
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
    },
  });
}
