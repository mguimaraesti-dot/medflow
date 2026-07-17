/**
 * Início da janela de antecedência do lembrete de WhatsApp — TypeScript
 * puro (regra de negócio, sem I/O) pra poder ser reaproveitado tanto pelo
 * cron (`run-accounts-payable-reminders.use-case.ts`) quanto pelo cálculo
 * de `reminderStatus` (`accounts-payable.response-dto.ts`) e pelo filtro
 * "Pendentes de envio" (`prisma-accounts-payable.repository.ts`) sem
 * duplicar a regra em nenhum dos três.
 *
 * `dueDate` já é meia-noite UTC (campo `@db.Date`) — subtrair dias em
 * UTC preserva isso, sem risco do fuso deslocar o dia (mesmo cuidado de
 * `formatDateOnlyBR`/`toAccountsPayableResponseDTO`).
 */
export function reminderWindowStart(
  dueDate: Date,
  reminderDaysBefore: number,
): Date {
  const start = new Date(dueDate);
  start.setUTCDate(start.getUTCDate() - reminderDaysBefore);
  return start;
}
