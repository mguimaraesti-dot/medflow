import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { sendStatusReportWhatsAppUseCase } from "@/features/reports/application/send-status-report-whatsapp.use-case";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { PaymentMethodRepository } from "@/features/payment-methods/domain/payment-method.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

const findUniqueMock = vi.fn();
vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    organization: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

const sendImageMessageMock = vi.fn();
vi.mock("@/core/whatsapp/zapi-client", () => ({
  sendImageMessage: (...args: unknown[]) => sendImageMessageMock(...args),
}));

const renderImageMock = vi.fn();
vi.mock("@/features/reports/infrastructure/status-report-image", () => ({
  renderStatusReportImage: (...args: unknown[]) => renderImageMock(...args),
}));

function buildDeps(overrides: { whatsapp?: string | null } = {}) {
  const safeRepository = {
    getBalanceAsOf: vi.fn().mockResolvedValue(new Prisma.Decimal("1000.00")),
  } as unknown as SafeRepository;

  const safeMovementRepository = {
    sumSignedByDateRangeAndStatus: vi
      .fn()
      .mockResolvedValue({ in: "500.00", out: "200.00" }),
    sumAdjustmentsSignedByDateRange: vi
      .fn()
      .mockResolvedValue({ in: "0.00", out: "0.00" }),
  } as unknown as SafeMovementRepository;

  const cashFlowEntryRepository = {
    listByDateRange: vi.fn().mockResolvedValue([]),
  } as unknown as CashFlowEntryRepository;

  const accountsPayableRepository = {
    sumPaidByCategoryAndDateRange: vi.fn().mockResolvedValue([]),
  } as unknown as AccountsPayableRepository;

  const categoryRepository = {
    listActive: vi.fn().mockResolvedValue([]),
  } as unknown as CategoryRepository;

  const paymentMethodRepository = {
    listActive: vi.fn().mockResolvedValue([]),
  } as unknown as PaymentMethodRepository;

  const organizationSettingsRepository = {
    findByOrganization: vi
      .fn()
      .mockResolvedValue(
        overrides.whatsapp === undefined
          ? { whatsapp: "11999999999" }
          : { whatsapp: overrides.whatsapp },
      ),
  } as unknown as OrganizationSettingsRepository;

  return {
    safeRepository,
    safeMovementRepository,
    cashFlowEntryRepository,
    accountsPayableRepository,
    categoryRepository,
    paymentMethodRepository,
    organizationSettingsRepository,
  };
}

describe("sendStatusReportWhatsAppUseCase", () => {
  const dateFrom = new Date("2026-07-01T00:00:00.000Z");
  const dateTo = new Date("2026-07-31T23:59:59.999Z");

  beforeEach(() => {
    findUniqueMock.mockReset().mockResolvedValue({ name: "Clínica MAE" });
    renderImageMock.mockReset().mockResolvedValue(new ArrayBuffer(8));
    sendImageMessageMock.mockReset().mockResolvedValue(undefined);
  });

  it("bloqueia quando a organização não tem WhatsApp configurado", async () => {
    const deps = buildDeps({ whatsapp: null });

    await expect(
      sendStatusReportWhatsAppUseCase("org-1", dateFrom, dateTo, deps),
    ).rejects.toThrow(WhatsAppNotConfiguredError);
    expect(renderImageMock).not.toHaveBeenCalled();
  });

  it("traduz falha no envio da Z-API em ReportWhatsAppSendError", async () => {
    sendImageMessageMock.mockRejectedValue(new Error("Z-API fora do ar"));
    const deps = buildDeps();

    await expect(
      sendStatusReportWhatsAppUseCase("org-1", dateFrom, dateTo, deps),
    ).rejects.toThrow(ReportWhatsAppSendError);
  });

  it("caminho feliz: gera a imagem do resumo do período e envia por WhatsApp", async () => {
    const deps = buildDeps();

    await sendStatusReportWhatsAppUseCase("org-1", dateFrom, dateTo, deps);

    expect(deps.safeRepository.getBalanceAsOf).toHaveBeenCalledWith(
      "org-1",
      dateFrom,
    );
    expect(renderImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationName: "Clínica MAE",
        openingBalance: "1000.00",
        closingBalance: "1300.00",
        totalIn: "500.00",
        totalOut: "200.00",
      }),
    );
    expect(sendImageMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "11999999999",
        image: expect.stringMatching(/^data:image\/png;base64,/),
      }),
    );
  });

  it("usa 'MedFlow' como nome padrão quando a organização não é encontrada", async () => {
    findUniqueMock.mockResolvedValue(null);
    const deps = buildDeps();

    await sendStatusReportWhatsAppUseCase("org-1", dateFrom, dateTo, deps);

    expect(renderImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ organizationName: "MedFlow" }),
    );
  });
});
