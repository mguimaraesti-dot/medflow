import { describe, it, expect, vi } from "vitest";
import { listAccountsPayableAttachmentsUseCase } from "@/features/accounts-payable/application/list-accounts-payable-attachments.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { AccountsPayableAttachmentRepository } from "@/features/accounts-payable/domain/accounts-payable-attachment.repository";

describe("listAccountsPayableAttachmentsUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;
    const attachmentRepository = {} as AccountsPayableAttachmentRepository;

    await expect(
      listAccountsPayableAttachmentsUseCase("payable-1", "org-1", {
        accountsPayableRepository,
        attachmentRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia conta de outra organização mesmo existindo", async () => {
    const accountsPayableRepository = {
      findById: vi
        .fn()
        .mockResolvedValue({ id: "payable-1", organizationId: "org-2" }),
    } as unknown as AccountsPayableRepository;
    const attachmentRepository = {} as AccountsPayableAttachmentRepository;

    await expect(
      listAccountsPayableAttachmentsUseCase("payable-1", "org-1", {
        accountsPayableRepository,
        attachmentRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("retorna os anexos da conta, ordenados pelo repositório", async () => {
    const accountsPayableRepository = {
      findById: vi
        .fn()
        .mockResolvedValue({ id: "payable-1", organizationId: "org-1" }),
    } as unknown as AccountsPayableRepository;
    const attachments = [
      { id: "attachment-2", fileName: "nota.pdf" },
      { id: "attachment-1", fileName: "boleto.pdf" },
    ];
    const listByAccountsPayableId = vi.fn().mockResolvedValue(attachments);
    const attachmentRepository = {
      listByAccountsPayableId,
    } as unknown as AccountsPayableAttachmentRepository;

    const result = await listAccountsPayableAttachmentsUseCase(
      "payable-1",
      "org-1",
      { accountsPayableRepository, attachmentRepository },
    );

    expect(listByAccountsPayableId).toHaveBeenCalledWith("payable-1");
    expect(result).toBe(attachments);
  });
});
