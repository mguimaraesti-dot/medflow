import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FilePlus,
  MessageCircle,
  MessageCircleWarning,
  Pencil,
  Repeat as RepeatIcon,
  RotateCcw,
  ShieldCheck,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatSmartDueDate,
} from "@/shared/lib/format";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { PayableStatus } from "../domain/accounts-payable.entity";
import type {
  RecurrencePeriodicity,
  RecurringBillDetail,
} from "./use-recurring-bill";
import type { AccountsPayableAuditLogEntry } from "./use-accounts-payable-audit-log";

/**
 * Texto formatado pra colar manualmente num grupo do WhatsApp — mesmo
 * formato do lembrete automático (`zapi-whatsapp-messaging.ts`), pra
 * quem prefere enviar na mão em vez de esperar o lembrete agendado.
 * Asteriscos são negrito no WhatsApp; nunca escapar. Só os dados
 * básicos — código de barras e chave PIX já têm seus próprios botões
 * de cópia, não entram aqui.
 */
export function buildWhatsAppMessage(input: {
  supplierName: string;
  description: string;
  amount: string;
  dueDate: string | Date;
}): string {
  return [
    "⚠️ *Conta a Pagar*",
    "",
    `Fornecedor: *${input.supplierName}*`,
    `Descrição: *${input.description}*`,
    `Valor: *${formatCurrencyBRL(input.amount)}*`,
    `Vencimento: *${formatDateOnlyBR(input.dueDate)}*`,
  ].join("\n");
}

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

/**
 * Cores fixas por nome de categoria (Sprint UX/UI 11) — a mesma categoria
 * usa sempre a mesma cor, independente do `color` cadastrado no banco.
 * Categorias fora deste mapa continuam usando `category.color` (definido
 * pelo usuário no cadastro), sem quebrar categorias customizadas.
 */
export const CATEGORY_COLOR_OVERRIDES: Record<string, string> = {
  Energia:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Internet:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  Software:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Marketing:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
  Impostos: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

/**
 * Nunca "0 conta(s)" (Sprint UX/UI 11) — linguagem natural + pluralização
 * correta pros cards de resumo.
 */
export function formatCardSubtitle(
  count: number,
  type: "hoje" | "pagas" | "generic" = "generic",
): string {
  if (count === 0) {
    if (type === "hoje") return "Nenhum vencimento";
    if (type === "pagas") return "Nenhum pagamento";
    return "Nenhuma conta";
  }
  return `${count} ${count === 1 ? "conta" : "contas"}`;
}

export interface DueDateDisplay {
  top: string;
  /** "" quando não há complemento a exibir na tabela (ex: data distante — dia da semana foi movido pro Tooltip/Drawer). */
  bottom: string;
  tone: "danger" | "warning" | "default";
  /** Dia da semana abreviado (ex: "Qua") — exibido só no Tooltip/Drawer, nunca direto na tabela (Refinamento Contas a Pagar). */
  weekday: string;
  /** Data completa (dd/MM/yyyy) — usada no Drawer quando `bottom` está vazio. */
  fullDate: string;
}

/**
 * Linha 1: relativo se estiver perto (Hoje/Amanhã/Há N dias) ou a data
 * curta; linha 2: complementa (data curta), nunca o dia da semana.
 *
 * `status`: conta PAGA ou CANCELADA já foi resolvida — nunca mostra "Há N
 * dias" em vermelho pra ela, mesmo que o vencimento tenha ficado no
 * passado (isso é esperado numa conta paga em atraso, não um alerta).
 * Sempre a data neutra, tom "default".
 */
export function getDueDateDisplay(
  dueDate: string | Date,
  status?: PayableStatus,
): DueDateDisplay {
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const shortDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  const weekdayRaw = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const fullDate = formatDateOnlyBR(date);

  const isResolved = status === "PAID" || status === "CANCELLED";
  const smart = isResolved ? "" : formatSmartDueDate(date);

  if (smart.startsWith("Há")) {
    return { top: smart, bottom: shortDate, tone: "danger", weekday, fullDate };
  }
  if (smart === "Hoje") {
    return {
      top: smart,
      bottom: shortDate,
      tone: "warning",
      weekday,
      fullDate,
    };
  }
  if (smart === "Amanhã") {
    return {
      top: smart,
      bottom: shortDate,
      tone: "default",
      weekday,
      fullDate,
    };
  }

  // Data distante (ou conta já paga/cancelada): só "15 Jul." na tabela —
  // dia da semana fica disponível no Tooltip/Drawer (Refinamento Contas a
  // Pagar).
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
  const compact = `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}.`;

  return { top: compact, bottom: "", tone: "default", weekday, fullDate };
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

/** Não existe um número sequencial real de movimentação — usa os últimos 8 caracteres do id (maiúsculo) como identificador curto pra exibição. */
export function shortMovementNumber(safeMovementId: string): string {
  return safeMovementId.slice(-8).toUpperCase();
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

/**
 * Nome de exibição da confirmação de pagamento — quando veio da
 * automação do WhatsApp, mostra "Dr. Flávio" em vez do nome técnico
 * real ("Automação WhatsApp (Z-API)"), que continua disponível (no
 * hover/tooltip de quem exibe isso) pra manter o registro técnico
 * visível. Só de exibição — `paidByUserName`/auditoria continuam
 * gravando o nome técnico real, sem mudança.
 */
export function getPaymentConfirmationDisplayName(
  detail: PaymentConfirmationDetail,
): string {
  return detail.source === "WhatsApp" ? "Dr. Flávio" : detail.userName;
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

        if (entry.after?.paymentOrigin === "COFRE") {
          const amount = entry.after?.amount;
          const safeMovementId = entry.after?.safeMovementId;
          const detailParts = [
            typeof amount === "string" ? formatCurrencyBRL(amount) : null,
            typeof safeMovementId === "string"
              ? `Movimentação Nº ${shortMovementNumber(safeMovementId)}`
              : null,
          ].filter(Boolean);
          events.push({
            id: entry.id,
            label: "Pagamento realizado utilizando saldo do Cofre",
            actor,
            detail: detailParts.join(" · ") || undefined,
            date,
            icon: CheckCircle2,
          });
          break;
        }

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
            label: "Beneficiário alterado",
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

      case "WHATSAPP_REMINDER_SENT": {
        // Automático = cron (userId null); manual = clique em "Enviar
        // WhatsApp agora" (userId do usuário logado). `actor` já resolve
        // pra "Sistema" no automático, mas "enviado por Sistema" lê mal —
        // por isso a redação muda por completo em vez de só trocar o nome.
        const isAutomatic = entry.userId === null;
        events.push({
          id: entry.id,
          label: isAutomatic
            ? "Lembrete enviado automaticamente"
            : `Lembrete enviado por ${actor}`,
          actor,
          date,
          icon: MessageCircle,
        });
        break;
      }

      case "WHATSAPP_REMINDER_FAILED": {
        const isAutomatic = entry.userId === null;
        events.push({
          id: entry.id,
          label: isAutomatic
            ? "Falha ao enviar lembrete automaticamente"
            : `Falha ao enviar lembrete (tentativa de ${actor})`,
          actor,
          detail: entry.reason ?? undefined,
          date,
          icon: MessageCircleWarning,
        });
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
