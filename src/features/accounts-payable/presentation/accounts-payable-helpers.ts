import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FilePlus,
  Pencil,
  Repeat as RepeatIcon,
  RotateCcw,
  ShieldCheck,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { formatDateOnlyBR, formatSmartDueDate } from "@/shared/lib/format";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { PayableStatus } from "../domain/accounts-payable.entity";
import type {
  RecurrencePeriodicity,
  RecurringBillDetail,
} from "./use-recurring-bill";
import type { AccountsPayableAuditLogEntry } from "./use-accounts-payable-audit-log";

export const STATUS_META: Record<
  PayableStatus,
  { label: string; badgeClassName: string; icon: LucideIcon }
> = {
  PENDING: {
    label: "Pendente",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  OVERDUE: {
    label: "Vencida",
    badgeClassName:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    icon: AlertTriangle,
  },
  PAID: {
    label: "Paga",
    badgeClassName:
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelada",
    badgeClassName:
      "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
    icon: Ban,
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

/** Origem da confirmação (`paidVia`) — hoje sempre "SYSTEM", pois o canal WhatsApp ainda não está integrado. */
function getPaymentSourceLabel(
  payable: AccountsPayableResponseDTO,
): "Sistema" | "WhatsApp" | null {
  if (payable.paidVia === "WHATSAPP") return "WhatsApp";
  if (payable.paidVia === "SYSTEM") return "Sistema";
  return null;
}

export interface PaymentConfirmationDetail {
  userName: string;
  source: "Sistema" | "WhatsApp";
  confirmedAt: Date;
}

/**
 * Auditoria de pagamento: quem confirmou (usuário real, nunca só "Sistema"),
 * por qual origem (Sistema/WhatsApp) e quando. `null` quando a conta ainda
 * não foi paga.
 */
export function getPaymentConfirmationDetail(
  payable: AccountsPayableResponseDTO,
): PaymentConfirmationDetail | null {
  const source = getPaymentSourceLabel(payable);
  if (!payable.paidByUserName || !payable.paidAt || !source) return null;
  return {
    userName: payable.paidByUserName,
    source,
    confirmedAt: payable.paidAt,
  };
}

export interface AccountsPayableEvent {
  id: string;
  label: string;
  actor: string;
  /** Detalhe complementar (ex: origem da confirmação, motivo, "De: X Para: Y") — exibido junto ao ator. */
  detail?: string;
  date: Date;
  icon: LucideIcon;
}

/** Usados só pra resolver nome (não id) nos diffs de fornecedor/categoria da timeline. */
export interface AccountsPayableEventLookups {
  supplierById?: Map<string, { name: string }>;
  categoryById?: Map<string, { name: string }>;
  /**
   * `updateAccountsPayableUseCase` sempre grava um `reason` mencionando
   * "ocorrência" (mesmo em contas avulsas — só o texto muda conforme o
   * scope escolhido no formulário). Só é seguro tratar isso como um evento
   * de recorrência quando a conta realmente pertence a uma (`recurringBillId`
   * não nulo) — senão toda edição de conta avulsa mostraria "Recorrência
   * alterada" indevidamente.
   */
  isRecurring?: boolean;
}

function changeDetail(
  before: unknown,
  after: unknown,
  resolveName?: (id: string) => string | undefined,
): string {
  const label = (value: unknown) => {
    if (typeof value === "string" && resolveName) {
      return resolveName(value) ?? value;
    }
    return String(value);
  };
  return `De: ${label(before)} Para: ${label(after)}`;
}

/**
 * Única fonte da timeline da conta (Histórico) — montada a partir do
 * AuditLog real (nunca reconstruída de createdAt/paidAt/status), cobrindo
 * todo o ciclo de vida: criação, edições (com diff de campo quando
 * possível), pagamento, cancelamento, exclusão/restauração (Soft Delete) e
 * alterações de recorrência. Substitui as antigas abas Histórico +
 * Auditoria (eram redundantes — Refinamento UX, unificação em uma só aba).
 */
export function toAccountsPayableEvents(
  entries: AccountsPayableAuditLogEntry[],
  lookups: AccountsPayableEventLookups = {},
): AccountsPayableEvent[] {
  const events: AccountsPayableEvent[] = [];
  const resolveSupplier = (id: string) => lookups.supplierById?.get(id)?.name;
  const resolveCategory = (id: string) => lookups.categoryById?.get(id)?.name;

  for (const entry of entries) {
    const actor = entry.userName ?? "Sistema";
    const date = new Date(entry.createdAt);

    switch (entry.action) {
      case "CREATE":
        events.push({
          id: entry.id,
          label: `Conta criada por ${actor}`,
          actor,
          date,
          icon: FilePlus,
        });
        break;

      case "PAYMENT_CONFIRMED": {
        const paidVia = entry.after?.paidVia;
        const source = paidVia === "WHATSAPP" ? "WhatsApp" : "Sistema";
        events.push({
          id: entry.id,
          label: "Pagamento confirmado",
          actor,
          detail: `Origem: ${source}`,
          date,
          icon: CheckCircle2,
        });
        break;
      }

      case "DELETE":
        events.push({
          id: entry.id,
          label: "Conta excluída",
          actor,
          detail: entry.reason ? `Motivo: ${entry.reason}` : undefined,
          date,
          icon: Trash2,
        });
        break;

      case "UPDATE": {
        if (entry.reason === "Conta restaurada.") {
          events.push({
            id: entry.id,
            label: "Conta restaurada",
            actor,
            date,
            icon: RotateCcw,
          });
          break;
        }

        if (entry.after?.status === "CANCELLED") {
          const endedSeries =
            entry.reason === "Cancelado ao encerrar a recorrência.";
          events.push({
            id: entry.id,
            label: endedSeries ? "Recorrência encerrada" : "Conta cancelada",
            actor,
            detail: endedSeries ? undefined : (entry.reason ?? undefined),
            date,
            icon: endedSeries ? RepeatIcon : ShieldCheck,
          });
          break;
        }

        const before = entry.before;
        const after = entry.after;
        const isRecurrenceEdit =
          Boolean(lookups.isRecurring) &&
          typeof entry.reason === "string" &&
          entry.reason.includes("ocorrência");

        const fieldDiff = (
          field: string,
        ): { from: unknown; to: unknown } | null => {
          if (!before || !after || !(field in after)) return null;
          const from = before[field];
          const to = after[field];
          return from !== to ? { from, to } : null;
        };

        const categoryDiff = fieldDiff("categoryId");
        const supplierDiff = fieldDiff("supplierId");
        const dueDateDiff = fieldDiff("dueDate");
        const descriptionDiff = fieldDiff("description");

        if (categoryDiff) {
          events.push({
            id: `${entry.id}-category`,
            label: "Categoria alterada",
            actor,
            detail: changeDetail(
              categoryDiff.from,
              categoryDiff.to,
              resolveCategory,
            ),
            date,
            icon: Tag,
          });
        }
        if (supplierDiff) {
          events.push({
            id: `${entry.id}-supplier`,
            label: "Fornecedor alterado",
            actor,
            detail: changeDetail(
              supplierDiff.from,
              supplierDiff.to,
              resolveSupplier,
            ),
            date,
            icon: Building2,
          });
        }
        if (dueDateDiff) {
          events.push({
            id: `${entry.id}-dueDate`,
            label: "Vencimento alterado",
            actor,
            detail: changeDetail(
              formatDateOnlyBR(dueDateDiff.from as string),
              formatDateOnlyBR(dueDateDiff.to as string),
            ),
            date,
            icon: CalendarClock,
          });
        }
        if (descriptionDiff) {
          events.push({
            id: `${entry.id}-description`,
            label: "Observação alterada",
            actor,
            detail: changeDetail(descriptionDiff.from, descriptionDiff.to),
            date,
            icon: Pencil,
          });
        }
        if (
          !categoryDiff &&
          !supplierDiff &&
          !dueDateDiff &&
          !descriptionDiff
        ) {
          // `entry.reason` aqui é sempre o texto padrão de escopo
          // ("...nesta ocorrência"/"...para recorrência") — nunca um motivo
          // customizado, então não faz sentido exibi-lo como detalhe.
          events.push({
            id: entry.id,
            label: "Conta editada",
            actor,
            date,
            icon: Pencil,
          });
        }

        if (isRecurrenceEdit) {
          events.push({
            id: `${entry.id}-recurrence`,
            label: "Recorrência alterada",
            actor,
            detail:
              entry.reason === "Alteração aplicada para recorrência."
                ? "Aplicado para esta e as próximas ocorrências"
                : "Aplicado apenas a esta ocorrência",
            date,
            icon: RepeatIcon,
          });
        }
        break;
      }

      default:
        events.push({
          id: entry.id,
          label: "Evento registrado",
          actor,
          date,
          icon: ShieldCheck,
        });
    }
  }

  return events;
}

/** "Competência" — mês/ano abreviado (ex: "Jul/2026") usado nas listagens de ocorrências de uma recorrência. */
export function formatCompetencia(dueDate: string | Date): string {
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const PERIODICITY_LABEL: Record<RecurrencePeriodicity, string> = {
  MONTHLY: "Mensal",
  BIWEEKLY: "Quinzenal",
  WEEKLY: "Semanal",
  YEARLY: "Anual",
};

/** Mesma lógica de avanço de data do `createRecurringAccountsPayableUseCase` — duplicada de propósito (presentation não importa application). */
function addPeriod(
  date: Date,
  periodicity: RecurrencePeriodicity,
  times: number,
): Date {
  const result = new Date(date);
  switch (periodicity) {
    case "WEEKLY":
      result.setUTCDate(result.getUTCDate() + 7 * times);
      return result;
    case "BIWEEKLY":
      result.setUTCDate(result.getUTCDate() + 14 * times);
      return result;
    case "YEARLY":
      result.setUTCFullYear(result.getUTCFullYear() + times);
      return result;
    case "MONTHLY":
    default:
      result.setUTCMonth(result.getUTCMonth() + times);
      return result;
  }
}

export interface RecurrenceDisplay {
  periodicityLabel: string;
  occurrenceLabel: string;
  startLabel: string;
  endLabel: string;
}

export function getRecurrenceDisplay(
  bill: RecurringBillDetail,
  occurrenceNumber: number | null,
): RecurrenceDisplay {
  const occurrenceLabel = occurrenceNumber
    ? bill.maxOccurrences
      ? `${occurrenceNumber} de ${bill.maxOccurrences}`
      : `${occurrenceNumber}`
    : "—";

  const startLabel = bill.firstDueDate
    ? formatDateOnlyBR(bill.firstDueDate)
    : "—";

  let endLabel = "Sem prazo";
  if (bill.maxOccurrences && bill.firstDueDate) {
    const end = addPeriod(
      new Date(bill.firstDueDate),
      bill.periodicity,
      bill.maxOccurrences - 1,
    );
    endLabel = formatDateOnlyBR(end);
  }

  return {
    periodicityLabel: PERIODICITY_LABEL[bill.periodicity],
    occurrenceLabel,
    startLabel,
    endLabel,
  };
}
