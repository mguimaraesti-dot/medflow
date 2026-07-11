"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api-client";
import type { OrganizationSettingsResponseDTO } from "../application/dtos/organization-settings.response-dto";

export function useOrganizationSettings() {
  return useQuery({
    queryKey: ["organization-settings"],
    queryFn: () =>
      apiFetch<OrganizationSettingsResponseDTO>("/api/organization-settings"),
  });
}
