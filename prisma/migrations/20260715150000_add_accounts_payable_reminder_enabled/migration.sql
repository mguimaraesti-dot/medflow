-- Interruptor por conta pro lembrete de WhatsApp — nenhum valor de
-- reminderDaysBefore significa "nunca" (o cron usa >=, nunca fecha).
-- Aditiva, com default true (comportamento atual preservado pras
-- linhas existentes).
ALTER TABLE "accounts_payable" ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT true;
