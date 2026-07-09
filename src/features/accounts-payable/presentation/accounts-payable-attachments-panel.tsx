"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeBR, formatFileSize } from "@/shared/lib/format";
import { getAccountsPayableAttachments } from "./accounts-payable-helpers";
import {
  useAccountsPayableAttachments,
  type AccountsPayableAttachmentDTO,
} from "./use-accounts-payable-attachments";
import { useUploadAccountsPayableAttachment } from "./use-upload-accounts-payable-attachment";
import { useDeleteAccountsPayableAttachment } from "./use-delete-accounts-payable-attachment";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/** Espelha ALLOWED_ATTACHMENT_MIME_TYPES/MAX_ATTACHMENT_SIZE_MB do backend — validação aqui é só feedback rápido, o backend valida de novo (nunca confia só no client). */
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_MB = 10;

/**
 * Aba "Documentos" do Drawer — combina o boleto legado (`boletoPdfUrl`,
 * link externo, sem upload) com os anexos reais enviados ao Google Drive
 * (upload/lista/exclusão). `canManage` reflete a mesma permissão de
 * editar a conta (PAYABLE_CREATE) — quem pode editar, pode anexar/excluir.
 */
export function AccountsPayableAttachmentsPanel({
  payable,
  canManage,
}: {
  payable: AccountsPayableResponseDTO;
  canManage: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AccountsPayableAttachmentDTO | null>(null);

  const { data: attachments, isLoading } = useAccountsPayableAttachments(
    payable.id,
  );
  const uploadAttachment = useUploadAccountsPayableAttachment();
  const deleteAttachment = useDeleteAccountsPayableAttachment();

  const legacyAttachments = getAccountsPayableAttachments(payable);
  const hasAnyAttachment =
    legacyAttachments.length > 0 || (attachments?.length ?? 0) > 0;

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(
          `"${file.name}": tipo não suportado. Envie PDF, JPG ou PNG.`,
        );
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`"${file.name}": excede o limite de ${MAX_SIZE_MB}MB.`);
        return;
      }
    }

    uploadAttachment.mutate(
      { accountsPayableId: payable.id, files },
      {
        onSuccess: () =>
          toast.success(
            files.length > 1 ? "Anexos enviados." : "Anexo enviado.",
          ),
        onError: (error) =>
          toast.error(
            error instanceof ApiError
              ? error.message
              : "Não foi possível enviar o anexo.",
          ),
      },
    );
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAttachment.mutateAsync({
        accountsPayableId: payable.id,
        attachmentId: deleteTarget.id,
      });
      toast.success("Anexo removido.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível remover o anexo.",
      );
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={handleFilesSelected}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadAttachment.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadAttachment.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Anexar arquivo
              </>
            )}
          </Button>
          <p className="text-muted-foreground mt-1 text-xs">
            PDF, JPG ou PNG — até {MAX_SIZE_MB}MB por arquivo.
          </p>
        </div>
      )}

      {!hasAnyAttachment && !isLoading && (
        <EmptyState
          icon={FileText}
          title="Nenhum documento."
          description="Documentos vinculados a esta conta (ex: boleto, comprovante) aparecem aqui."
        />
      )}

      {legacyAttachments.length > 0 && (
        <ul className="space-y-2">
          {legacyAttachments.map((attachment) => (
            <li
              key={attachment.url}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-2">
                <FileText className="text-muted-foreground h-4 w-4" />
                <span className="text-sm">{attachment.name}</span>
              </div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Baixar</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {attachments && attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="text-muted-foreground h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm">{attachment.fileName}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatFileSize(attachment.sizeBytes)} ·{" "}
                    {attachment.createdByUserName} ·{" "}
                    {formatDateTimeBR(attachment.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={`/api/accounts-payable/${payable.id}/attachments/${attachment.id}`}
                  className="text-muted-foreground hover:text-foreground p-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Baixar</span>
                </a>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => setDeleteTarget(attachment)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir anexo"
        description={
          deleteTarget
            ? `Remover "${deleteTarget.fileName}"? Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir anexo"
        pendingLabel="Excluindo..."
        isPending={deleteAttachment.isPending}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
