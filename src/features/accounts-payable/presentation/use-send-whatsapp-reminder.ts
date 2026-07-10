"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";

export function useSendWhatsAppReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountsPayableId: string) =>
      apiFetch<{ id: string }>(
        `/api/accounts-payable/${accountsPayableId}/send-whatsapp-reminder`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
    },
  });
}
