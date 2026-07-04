"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { ReverseCashFlowEntryInput } from "../application/dtos/reverse-cash-flow-entry.dto";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";

interface ReverseResult {
  original: CashFlowEntryResponseDTO;
  reversal: CashFlowEntryResponseDTO;
}

export function useReverseCashFlowEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      input,
    }: {
      entryId: string;
      input: ReverseCashFlowEntryInput;
    }) =>
      apiFetch<ReverseResult>(`/api/cash-flow/${entryId}/reverse`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow", "entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow", "insights"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register", "today"] });
    },
  });
}
