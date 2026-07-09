import { describe, it, expect, vi } from "vitest";
import { uploadAccountsPayableAttachmentUseCase } from "@/features/accounts-payable/application/upload-accounts-payable-attachment.use-case";
import {
  AttachmentStorageError,
  AttachmentTooLargeError,
  NotFoundError,
  UnsupportedAttachmentTypeError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { AccountsPayableAttachmentRepository } from "@/features/accounts-payable/domain/accounts-payable-attachment.repository";
import type { AttachmentStoragePort } from "@/features/accounts-payable/domain/attachment-storage.port";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn(), createMany: vi.fn() } },
}));

const payable = { id: "payable-1", organizationId: "org-1", status: "PENDING" };

function buildInput(
  overrides: Partial<{ mimeType: string; size: number }> = {},
) {
  return {
    fileName: "boleto.pdf",
    mimeType: overrides.mimeType ?? "application/pdf",
    buffer: Buffer.alloc(overrides.size ?? 1024),
  };
}

describe("uploadAccountsPayableAttachmentUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AccountsPayableRepository;
    const attachmentRepository = {} as AccountsPayableAttachmentRepository;
    const attachmentStorage = {} as AttachmentStoragePort;

    await expect(
      uploadAccountsPayableAttachmentUseCase(
        "payable-1",
        buildInput(),
        "user-1",
        "org-1",
        { accountsPayableRepository, attachmentRepository, attachmentStorage },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia tipo de arquivo não suportado", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
    } as unknown as AccountsPayableRepository;
    const attachmentRepository = {} as AccountsPayableAttachmentRepository;
    const attachmentStorage = {} as AttachmentStoragePort;

    await expect(
      uploadAccountsPayableAttachmentUseCase(
        "payable-1",
        buildInput({ mimeType: "application/zip" }),
        "user-1",
        "org-1",
        { accountsPayableRepository, attachmentRepository, attachmentStorage },
      ),
    ).rejects.toThrow(UnsupportedAttachmentTypeError);
  });

  it("bloqueia arquivo maior que 10MB", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
    } as unknown as AccountsPayableRepository;
    const attachmentRepository = {} as AccountsPayableAttachmentRepository;
    const attachmentStorage = {} as AttachmentStoragePort;

    await expect(
      uploadAccountsPayableAttachmentUseCase(
        "payable-1",
        buildInput({ size: 11 * 1024 * 1024 }),
        "user-1",
        "org-1",
        { accountsPayableRepository, attachmentRepository, attachmentStorage },
      ),
    ).rejects.toThrow(AttachmentTooLargeError);
  });

  it("envia pro storage e grava o metadado no banco", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
    } as unknown as AccountsPayableRepository;
    const create = vi.fn().mockResolvedValue({
      id: "attachment-1",
      organizationId: "org-1",
      accountsPayableId: "payable-1",
      driveFileId: "drive-file-1",
      fileName: "boleto.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      createdByUserId: "user-1",
      createdByUserName: "Ana",
      createdAt: new Date(),
    });
    const attachmentRepository = {
      create,
    } as unknown as AccountsPayableAttachmentRepository;
    const upload = vi
      .fn()
      .mockResolvedValue({ externalId: "drive-file-1", sizeBytes: 1024 });
    const attachmentStorage = { upload } as unknown as AttachmentStoragePort;

    const result = await uploadAccountsPayableAttachmentUseCase(
      "payable-1",
      buildInput(),
      "user-1",
      "org-1",
      { accountsPayableRepository, attachmentRepository, attachmentStorage },
    );

    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        accountsPayableId: "payable-1",
        fileName: "boleto.pdf",
        mimeType: "application/pdf",
      }),
    );
    expect(create).toHaveBeenCalledWith({
      organizationId: "org-1",
      accountsPayableId: "payable-1",
      driveFileId: "drive-file-1",
      fileName: "boleto.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      createdByUserId: "user-1",
    });
    expect(result.id).toBe("attachment-1");
  });

  it("propaga AttachmentStorageError quando o Drive falha, sem gravar nada no banco", async () => {
    const accountsPayableRepository = {
      findById: vi.fn().mockResolvedValue(payable),
    } as unknown as AccountsPayableRepository;
    const create = vi.fn();
    const attachmentRepository = {
      create,
    } as unknown as AccountsPayableAttachmentRepository;
    const upload = vi.fn().mockRejectedValue(new Error("quota exceeded"));
    const attachmentStorage = { upload } as unknown as AttachmentStoragePort;

    await expect(
      uploadAccountsPayableAttachmentUseCase(
        "payable-1",
        buildInput(),
        "user-1",
        "org-1",
        { accountsPayableRepository, attachmentRepository, attachmentStorage },
      ),
    ).rejects.toThrow(AttachmentStorageError);
    expect(create).not.toHaveBeenCalled();
  });
});
