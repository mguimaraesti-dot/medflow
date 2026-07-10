export interface OrganizationSettings {
  id: string;
  organizationId: string;
  timezone: string;
  openingTime: string;
  closingTime: string;
  /** Número que recebe os lembretes de cobrança via WhatsApp (Z-API) — `null` = organização ainda não configurou. */
  whatsapp: string | null;
}
