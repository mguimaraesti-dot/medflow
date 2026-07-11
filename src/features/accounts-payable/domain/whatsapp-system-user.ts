/**
 * Usuário de sistema que representa confirmações automáticas de
 * pagamento via WhatsApp (clique no botão "Pago" no webhook da Z-API,
 * sem ninguém logado) — nunca faz login de verdade (sem conta real no
 * Supabase Auth), só existe pra manter `paidByUserId`/`performedByUserId`
 * apontando pra um usuário real no AuditLog/SafeMovement, preservando
 * a rastreabilidade exigida mesmo sem uma pessoa logada no momento da
 * confirmação. Criado pelo seed (`prisma/seed.ts`) — o webhook
 * (`handle-zapi-webhook.use-case.ts`) busca esse usuário por e-mail.
 */
export const WHATSAPP_SYSTEM_USER_EMAIL = "automacao.whatsapp@medflow.internal";
export const WHATSAPP_SYSTEM_USER_NAME = "Automação WhatsApp (Z-API)";
