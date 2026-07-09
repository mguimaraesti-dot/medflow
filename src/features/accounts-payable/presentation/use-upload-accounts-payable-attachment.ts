"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { AccountsPayableAttachmentDTO } from "./use-accounts-payable-attachments";

export function useUploadAccountsPayableAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountsPayableId,
      files,
    }: {
      accountsPayableId: string;
      files: File[];
    }) => {
      const formData = new FormData();
      for (const file of files) formData.append("files", file);
      return apiFetch<AccountsPayableAttachmentDTO[]>(
        `/api/accounts-payable/${accountsPayableId}/attachments`,
        { method: "POST", body: formData },
      );
    },
    onSuccess: (_data, { accountsPayableId }) => {
      queryClient.invalidateQueries({
        queryKey: ["accounts-payable-attachments", accountsPayableId],
      });
    },
  });
}
