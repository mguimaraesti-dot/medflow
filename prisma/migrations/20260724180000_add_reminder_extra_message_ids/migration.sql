-- Ids (Z-API) das mensagens EXTRAS do lembrete (boleto/PIX) — a
-- principal continua só em "lastReminderMessageId". Aditiva, sem
-- backfill: contas existentes ficam com array vazio, que é correto
-- (nenhuma delas tinha ids de boleto/PIX capturados até agora).
ALTER TABLE "accounts_payable" ADD COLUMN "reminderExtraMessageIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
