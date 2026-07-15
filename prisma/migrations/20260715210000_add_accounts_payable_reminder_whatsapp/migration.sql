-- Destino específico dos lembretes de WhatsApp de Contas a Pagar
-- (número comum OU id de grupo, ex: "120363...-group"). Aditiva,
-- sem default e nullable — vazio cai no fallback (`whatsapp`), então
-- nenhuma linha existente muda de comportamento.
ALTER TABLE "organization_settings" ADD COLUMN "accountsPayableReminderWhatsapp" TEXT;
