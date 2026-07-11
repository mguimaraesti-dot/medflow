export interface OrganizationSettings {
  id: string;
  organizationId: string;
  timezone: string;
  openingTime: string;
  closingTime: string;
  /** Número que recebe os lembretes de cobrança via WhatsApp (Z-API) — `null` = organização ainda não configurou. */
  whatsapp: string | null;
  /** Hora (0-23, no timezone acima) em que o cron de lembretes de Contas a Pagar dispara. */
  reminderSendHour: number;
}
