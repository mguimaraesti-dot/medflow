import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type {
  DashboardAlerts,
  DashboardAlert,
} from "../domain/dashboard-alerts.entity";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
  accountsPayableRepository: AccountsPayableRepository;
  /** Injetado só para permitir teste determinístico — em produção é sempre `new Date()`. */
  referenceDate?: Date;
}

const DEFAULT_OPENING_TIME = "08:00";
const DEFAULT_CLOSING_TIME = "18:00";

/** Comparação simples em UTC — mesma simplificação de timezone já usada no resto do sistema (Task 5A). */
function isAfterTime(now: Date, hhmm: string): boolean {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return nowMinutes >= hours * 60 + minutes;
}

/** US10 — Alertas do Dashboard. */
export async function getDashboardAlertsUseCase(
  organizationId: string,
  deps: Deps,
): Promise<DashboardAlerts> {
  const now = deps.referenceDate ?? new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const [todayRegister, settings, reversedCount, overduePayables] =
    await Promise.all([
      deps.cashRegisterDayRepository.findByOrganizationAndDate(
        organizationId,
        today,
      ),
      deps.organizationSettingsRepository.findByOrganization(organizationId),
      deps.cashFlowEntryRepository.countReversedToday(
        organizationId,
        today,
        endOfToday,
      ),
      deps.accountsPayableRepository.list(
        { organizationId, status: "OVERDUE" },
        { page: 1, pageSize: 1 },
      ),
    ]);

  const openingTime = settings?.openingTime ?? DEFAULT_OPENING_TIME;
  const closingTime = settings?.closingTime ?? DEFAULT_CLOSING_TIME;

  const alerts: DashboardAlert[] = [];

  if (!todayRegister) {
    if (isAfterTime(now, openingTime)) {
      alerts.push({
        code: "CASH_REGISTER_NOT_OPENED",
        severity: "warning",
        message: "Caixa de hoje ainda não foi aberto.",
      });
    }
  } else if (todayRegister.status === "OPEN" && isAfterTime(now, closingTime)) {
    alerts.push({
      code: "CASH_REGISTER_NOT_CLOSED",
      severity: "warning",
      message: "Caixa de hoje ainda não foi fechado.",
    });
  }

  if (reversedCount > 0) {
    const plural = reversedCount > 1 ? "s" : "";
    alerts.push({
      code: "REVERSED_ENTRIES_TODAY",
      severity: "info",
      message: `Existem ${reversedCount} lançamento${plural} estornado${plural} hoje.`,
    });
  }

  if (overduePayables.total > 0) {
    const plural = overduePayables.total > 1 ? "s" : "";
    alerts.push({
      code: "OVERDUE_PAYABLES",
      severity: "warning",
      message: `Existem ${overduePayables.total} conta${plural} a pagar vencida${plural}.`,
    });
  }

  return { alerts };
}
