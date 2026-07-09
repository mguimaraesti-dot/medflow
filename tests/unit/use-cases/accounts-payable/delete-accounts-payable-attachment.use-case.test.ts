import { describe, it, expect, vi } from "vitest";
import { deleteAccountsPayableAttachmentUseCase } from "@/features/accounts-payable/application/delete-accounts-payable-attachment.use-case";
import {
  AttachmentStorageError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { AccountsPayableAttachmentRepository } from "@/features/accounts-payable/domain/accounts-payable-attachment.repository";
import type { AttachmentStoragePort } from "@/features/accounts-payable/domain/attachment-storage.port";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn(), createMany: vi.fn() } },
}));

const payable = { id: "payable-1", organizationId: "org-1" };
const attachment = {
  id: "attachment-1",
  accountsPayableId: "payable-1",
  driveFileId: "drive-file-1",
  fileName: "boleto.pdf",
};

describe("deleteAccountsPayableAttachmentUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;
    const attachmentRepository = {} as AccountsPayableAttachmentRepository;
    const attachmentStorage = {} as AttachmentStoragePort;

    await expect(
      deleteAccountsPayableAttachmentUseCase(
        "payable-1",
        "attachment-1",
        "user-1",
        "org-1",
        { accountsPayableRepository, attachmentRepository, attachmentStorage },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia quando o anexo não existe ou pertence a outra conta", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
    } as unknown as AccountsPayableRepository;
    const attachmentRepository = {
      findById: vi
        .fn()
        .mockResolvedValue({ ...attachment, accountsPayableId: "payable-2" }),
    } as unknown as AccountsPayableAttachmentRepository;
    const attachmentStorage = {} as AttachmentStoragePort;

    await expect(
      deleteAccountsPayableAttachmentUseCase(
        "payable-1",
        "attachment-1",
        "user-1",
        "org-1",
        { accountsPayableRepository, attachmentRepository, attachmentStorage },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("exclui do Drive e do banco", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
    } as unknown as AccountsPayableRepository;
    const deleteAttachment = vi.fn();
    const attachmentRepository = {
      findById: vi.fn().mockResolvedValue(attachment),
      delete: deleteAttachment,
    } as unknown as AccountsPayableAttachmentRepository;
    const deleteFromStorage = vi.fn().mockResolvedValue(undefined);
    const attachmentStorage = {
      delete: deleteFromStorage,
    } as unknown as AttachmentStoragePort;

    await deleteAccountsPayableAttachmentUseCase(
      "payable-1",
      "attachment-1",
      "user-1",
      "org-1",
      { accountsPayableRepository, attachmentRepository, attachmentStorage },
    );

    expect(deleteFromStorage).toHaveBeenCalledWith("drive-file-1");
    expect(deleteAttachment).toHaveBeenCalledWith("attachment-1");
  });

  it("propaga AttachmentStorageError e não remove o registro quando o Drive falha por um motivo real", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
    } as unknown as AccountsPayableRepository;
    const deleteAttachment = vi.fn();
    const attachmentRepository = {
      findById: vi.fn().mockResolvedValue(attachment),
      delete: deleteAttachment,
    } as unknown as AccountsPayableAttachmentRepository;
    const deleteFromStorage = vi.fn().mockRejectedValue(new Error("timeout"));
    const attachmentStorage = {
      delete: deleteFromStorage,
    } as unknown as AttachmentStoragePort;

    await expect(
      deleteAccountsPayableAttachmentUseCase(
        "payable-1",
        "attachment-1",
        "user-1",
        "org-1",
        { accountsPayableRepository, attachmentRepository, attachmentStorage },
      ),
    ).rejects.toThrow(AttachmentStorageError);
    expect(deleteAttachment).not.toHaveBeenCalled();
  });
});
