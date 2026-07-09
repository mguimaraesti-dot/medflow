"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export interface AccountsPayableAttachmentDTO {
  id: string;
  accountsPayableId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserName: string;
  createdAt: string;
}

export function useAccountsPayableAttachments(
  accountsPayableId: string | null,
) {
  return useQuery({
    queryKey: ["accounts-payable-attachments", accountsPayableId],
    queryFn: () =>
      apiFetch<AccountsPayableAttachmentDTO[]>(
        `/api/accounts-payable/${accountsPayableId}/attachments`,
      ),
    enabled: accountsPayableId !== null,
  });
}
