import { formatSmartDueDate } from "@/shared/lib/format";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { PayableStatus } from "../domain/accounts-payable.entity";

export const STATUS_META: Record<
  PayableStatus,
  { label: string; badgeClassName: string }
> = {
  PENDING: {
    label: "Pendente",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  OVERDUE: {
    label: "Vencida",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  PAID: {
    label: "Paga",
    badgeClassName:
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
  },
  CANCELLED: {
    label: "Cancelada",
    badgeClassName:
      "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
};

export interface DueDateDisplay {
  top: string;
  bottom: string;
  tone: "danger" | "warning" | "default";
}

/** Linha 1: relativo se estiver perto (Hoje/Amanhã/Há N dias) ou a data curta; linha 2: complementa (data curta ou dia da semana). */
export function getDueDateDisplay(dueDate: string | Date): DueDateDisplay {
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const shortDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);

  const smart = formatSmartDueDate(date);

  if (smart.startsWith("Há")) {
    return { top: smart, bottom: shortDate, tone: "danger" };
  }
  if (smart === "Hoje") {
    return { top: smart, bottom: shortDate, tone: "warning" };
  }
  if (smart === "Amanhã") {
    return { top: smart, bottom: shortDate, tone: "default" };
  }

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");

  return {
    top: smart,
    bottom: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    tone: "default",
  };
}

export interface AccountsPayableAttachment {
  name: string;
  url: string;
}

/**
 * Hoje o único documento real vinculado à conta é o boleto (boletoPdfUrl) — não existe
 * tabela de anexos no domínio ainda. Quando existir, só este helper muda.
 */
export function getAccountsPayableAttachments(
  payable: AccountsPayableResponseDTO,
): AccountsPayableAttachment[] {
  const attachments: AccountsPayableAttachment[] = [];
  if (payable.boletoPdfUrl) {
    attachments.push({ name: "Boleto (PDF)", url: payable.boletoPdfUrl });
  }
  return attachments;
}

/** Lê a origem real da confirmação (`paidVia`) — hoje sempre "SYSTEM", pois o canal WhatsApp ainda não está integrado. */
export function getConfirmedByLabel(
  payable: AccountsPayableResponseDTO,
): "Sistema" | "WhatsApp" | null {
  if (payable.paidVia === "WHATSAPP") return "WhatsApp";
  if (payable.paidVia === "SYSTEM") return "Sistema";
  return null;
}

export interface AccountsPayableEvent {
  id: string;
  label: string;
  actor: string;
  /** null quando o DTO atual não expõe um timestamp confiável para o evento (ex: cancelamento). */
  date: Date | null;
}

/** Eventos derivados só do que o DTO já expõe hoje (createdAt/paidAt/status) — sem novo endpoint. */
export function getAccountsPayableEvents(
  payable: AccountsPayableResponseDTO,
): AccountsPayableEvent[] {
  const events: AccountsPayableEvent[] = [
    {
      id: "created",
      label: "Conta cadastrada",
      actor: "Sistema",
      date: payable.createdAt,
    },
  ];

  if (payable.paidAt) {
    events.push({
      id: "paid",
      label: "Pagamento confirmado",
      actor: getConfirmedByLabel(payable) ?? "Sistema",
      date: payable.paidAt,
    });
  }

  if (payable.status === "CANCELLED") {
    events.push({
      id: "cancelled",
      label: "Conta cancelada",
      actor: "Sistema",
      date: null,
    });
  }

  return events;
}
