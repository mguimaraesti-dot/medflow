import { describe, it, expect, vi, afterEach } from "vitest";
import { runAccountsPayableRemindersUseCase } from "@/features/accounts-payable/application/run-accounts-payable-reminders.use-case";
import { sendAccountsPayableWhatsAppReminderUseCase } from "@/features/accounts-payable/application/send-accounts-payable-whatsapp-reminder.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { WhatsAppMessagingPort } from "@/features/accounts-payable/domain/whatsapp-messaging.port";

vi.mock(
  "@/features/accounts-payable/application/send-accounts-payable-whatsapp-reminder.use-case",
  () => ({ sendAccountsPayableWhatsAppReminderUseCase: vi.fn() }),
);

const TODAY = new Date("2026-07-20T00:00:00.000Z");
// Meia-noite UTC = 21h do dia anterior em America/Sao_Paulo (UTC-3, sem
// DST atualmente) — usado como reminderSendHour "de fábrica" nos testes
// que esperam que o envio de fato aconteça.
const CURRENT_HOUR_SP = 21;

function payable(overrides: Record<string, unknown> = {}) {
  return {
    id: "payable-1",
    dueDate: new Date("2026-07-25T00:00:00.000Z"),
    reminderDaysBefore: 5,
    lastReminderSentAt: null,
    ...overrides,
  };
}

function buildDeps(
  candidates: ReturnType<typeof payable>[],
  overrides: {
    whatsapp?: string | null;
    reminderSendHour?: number;
    timezone?: string;
    settings?: Record<string, unknown> | null;
  } = {},
) {
  const accountsPayableRepository = {
    listPendingForReminders: vi.fn().mockResolvedValue(candidates),
  } as unknown as AccountsPayableRepository;

  const organizationSettingsRepository = {
    findByOrganization: vi.fn().mockResolvedValue(
      overrides.settings === undefined
        ? {
            whatsapp:
              overrides.whatsapp === undefined
                ? "11999999999"
                : overrides.whatsapp,
            timezone: overrides.timezone ?? "America/Sao_Paulo",
            reminderSendHour: overrides.reminderSendHour ?? CURRENT_HOUR_SP,
          }
        : overrides.settings,
    ),
  } as never;

  const whatsAppMessaging = {
    sendSeparatorMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as WhatsAppMessagingPort;

  return {
    accountsPayableRepository,
    organizationSettingsRepository,
    supplierRepository: {} as never,
    whatsAppMessaging,
  };
}

describe("runAccountsPayableRemindersUseCase", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase).mockReset();
  });

  it("envia quando hoje já entrou na janela (hoje >= dueDate - reminderDaysBefore)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase).mockResolvedValue();

    const candidate = payable({
      dueDate: new Date("2026-07-25T00:00:00.000Z"),
      reminderDaysBefore: 5,
    });
    const deps = buildDeps([candidate]);

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(sendAccountsPayableWhatsAppReminderUseCase).toHaveBeenCalledWith(
      "payable-1",
      "org-1",
      null,
      deps,
    );
    expect(result).toEqual({ sentCount: 1, failedCount: 0 });
  });

  it("não envia quando ainda não entrou na janela", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const candidate = payable({
      dueDate: new Date("2026-07-30T00:00:00.000Z"),
      reminderDaysBefore: 5,
    });
    const deps = buildDeps([candidate]);

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(sendAccountsPayableWhatsAppReminderUseCase).not.toHaveBeenCalled();
    expect(result).toEqual({ sentCount: 0, failedCount: 0 });
  });

  it("não reenvia quando já foi lembrado hoje", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const candidate = payable({
      dueDate: new Date("2026-07-25T00:00:00.000Z"),
      reminderDaysBefore: 5,
      lastReminderSentAt: new Date("2026-07-20T10:00:00.000Z"),
    });
    const deps = buildDeps([candidate]);

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(sendAccountsPayableWhatsAppReminderUseCase).not.toHaveBeenCalled();
    expect(result).toEqual({ sentCount: 0, failedCount: 0 });
  });

  it("reenvia quando o último lembrete foi em um dia anterior", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase).mockResolvedValue();

    const candidate = payable({
      dueDate: new Date("2026-07-25T00:00:00.000Z"),
      reminderDaysBefore: 5,
      lastReminderSentAt: new Date("2026-07-19T10:00:00.000Z"),
    });
    const deps = buildDeps([candidate]);

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(sendAccountsPayableWhatsAppReminderUseCase).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sentCount: 1, failedCount: 0 });
  });

  it("uma falha de envio não interrompe as demais contas do lote", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase)
      .mockRejectedValueOnce(new Error("falhou"))
      .mockResolvedValueOnce(undefined);

    const candidates = [
      payable({ id: "payable-1" }),
      payable({ id: "payable-2" }),
    ];
    const deps = buildDeps(candidates);

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(sendAccountsPayableWhatsAppReminderUseCase).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sentCount: 1, failedCount: 1 });
  });

  it("insere separador entre contas do mesmo lote, mas nunca antes da primeira", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase).mockResolvedValue();

    const candidates = [
      payable({ id: "payable-1" }),
      payable({ id: "payable-2" }),
      payable({ id: "payable-3" }),
    ];
    const deps = buildDeps(candidates);

    await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(deps.whatsAppMessaging.sendSeparatorMessage).toHaveBeenCalledTimes(
      2,
    );
    expect(deps.whatsAppMessaging.sendSeparatorMessage).toHaveBeenCalledWith(
      "11999999999",
    );
  });

  it("não envia separador quando só há 1 conta due no lote", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase).mockResolvedValue();

    const deps = buildDeps([payable({ id: "payable-1" })]);

    await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(deps.whatsAppMessaging.sendSeparatorMessage).not.toHaveBeenCalled();
  });

  it("não processa quando a hora atual não bate com reminderSendHour (nem consulta contas pendentes)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const deps = buildDeps([payable()], {
      reminderSendHour: CURRENT_HOUR_SP + 1,
    });

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(
      deps.accountsPayableRepository.listPendingForReminders,
    ).not.toHaveBeenCalled();
    expect(sendAccountsPayableWhatsAppReminderUseCase).not.toHaveBeenCalled();
    expect(result).toEqual({ sentCount: 0, failedCount: 0 });
  });

  it("processa quando a hora atual bate com reminderSendHour, no timezone configurado", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase).mockResolvedValue();

    const deps = buildDeps([payable()], {
      reminderSendHour: CURRENT_HOUR_SP,
      timezone: "America/Sao_Paulo",
    });

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(result).toEqual({ sentCount: 1, failedCount: 0 });
  });

  it("não quebra quando a organização não tem OrganizationSettings (nem consulta contas pendentes)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const deps = buildDeps([payable()], { settings: null });

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(
      deps.accountsPayableRepository.listPendingForReminders,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({ sentCount: 0, failedCount: 0 });
  });

  it("não quebra quando a organização não tem WhatsApp configurado (cada conta falha por conta própria)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    vi.mocked(sendAccountsPayableWhatsAppReminderUseCase).mockResolvedValue();

    const candidates = [
      payable({ id: "payable-1" }),
      payable({ id: "payable-2" }),
    ];
    const deps = buildDeps(candidates, { whatsapp: null });

    const result = await runAccountsPayableRemindersUseCase("org-1", deps);

    expect(deps.whatsAppMessaging.sendSeparatorMessage).not.toHaveBeenCalled();
    expect(result).toEqual({ sentCount: 2, failedCount: 0 });
  });
});
