-- Hora (0-23, no timezone de OrganizationSettings.timezone) em que o
-- cron de lembretes de Contas a Pagar deve disparar. Aditiva, com
-- default 7 (comportamento atual preservado pra linhas existentes).
ALTER TABLE "organization_settings" ADD COLUMN "reminderSendHour" INTEGER NOT NULL DEFAULT 7;
