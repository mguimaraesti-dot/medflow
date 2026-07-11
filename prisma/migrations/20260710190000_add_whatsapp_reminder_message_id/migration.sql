-- Guarda o id da mensagem de texto (Z-API) do cartão-resumo do
-- lembrete de WhatsApp -- usado pra casar a resposta "PAGO" (citando
-- essa mensagem) com a conta certa, já que o número de WhatsApp é
-- único pra clínica inteira (nunca por conta). Aditiva, nullable.

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "lastReminderMessageId" TEXT;
