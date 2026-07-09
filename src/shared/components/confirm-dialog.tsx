"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { cn } from "@/shared/lib/utils";

/**
 * Diálogo de confirmação padrão do MedFlow (Refinamentos de UX/UI) —
 * título + "Deseja continuar?" + dois botões, sem explicações técnicas.
 * Reaproveitado por qualquer ação que precise de confirmação simples
 * (excluir, cancelar, encerrar), pra manter a linguagem e o visual
 * idênticos em todos os fluxos.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description = "Deseja continuar?",
  cancelLabel = "Cancelar",
  confirmLabel,
  pendingLabel,
  isPending,
  confirmDisabled,
  destructive = true,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel: string;
  /** Texto do botão de confirmação enquanto a ação está em andamento (ex: "Excluindo..."). */
  pendingLabel?: string;
  isPending?: boolean;
  /** Desabilita o botão sem trocar o texto pro `pendingLabel` — usado quando falta preencher um campo obrigatório (ex: motivo). */
  confirmDisabled?: boolean;
  /** true por padrão — toda ação confirmada aqui é irreversível do ponto de vista do usuário. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Conteúdo extra opcional entre a mensagem e os botões (ex: campo de motivo). */
  children?: ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            disabled={isPending || confirmDisabled}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
