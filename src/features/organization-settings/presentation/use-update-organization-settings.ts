"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { UpdateOrganizationSettingsInput } from "../application/dtos/update-organization-settings.dto";
import type { OrganizationSettingsResponseDTO } from "../application/dtos/organization-settings.response-dto";

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganizationSettingsInput) =>
      apiFetch<OrganizationSettingsResponseDTO>("/api/organization-settings", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    },
  });
}
