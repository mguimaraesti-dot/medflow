-- Novo valor no enum AuditAction: registra a FALHA de envio de lembrete
-- de WhatsApp (hoje só o sucesso é gravado, via WHATSAPP_REMINDER_SENT).
-- ADD VALUE em enum Postgres é puramente aditivo — não afeta linhas
-- existentes nem o valor já usado por WHATSAPP_REMINDER_SENT.
ALTER TYPE "AuditAction" ADD VALUE 'WHATSAPP_REMINDER_FAILED';
