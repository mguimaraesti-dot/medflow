-- Cobrança via WhatsApp (Z-API): lembrete automático até a conta ser
-- paga. reminderDaysBefore conta a partir de dueDate (ex: 5 = começa a
-- lembrar 5 dias antes do vencimento); lastReminderSentAt evita
-- reenviar mais de uma vez no mesmo dia. Aditiva, com default seguro
-- pras linhas existentes.

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "reminderDaysBefore" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3);

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_REMINDER_SENT';
