"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

/**
 * Diálogo só-informativo (um único botão "OK") — diferente do
 * `ConfirmDialog` padrão (que sempre tem Cancelar + Confirmar), porque
 * aqui não há nada pra confirmar: a exclusão já está bloqueada.
 */
export function CategoryDeleteBlockedDialog({
  open,
  onOpenChange,
  linkedRecordsCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedRecordsCount: number;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Não é possível excluir</AlertDialogTitle>
          <AlertDialogDescription>
            Esta categoria não pode ser excluída porque existem contas
            vinculadas.
            <br />
            <br />
            Quantidade: {linkedRecordsCount}{" "}
            {linkedRecordsCount === 1 ? "conta" : "contas"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
