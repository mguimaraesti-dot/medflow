"use client";

import {
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/**
 * Menu "⋯" de ações secundárias de uma conta — extraído da tabela pra
 * ser reaproveitado também pelos cards mobile (`accounts-payable-cards.tsx`),
 * evitando duas cópias da mesma lógica de quais ações aparecem por
 * status divergirem ao longo do tempo.
 */
export function AccountsPayableRowMenu({
  payable,
  canCreate,
  canDelete,
  canCancelThis,
  onView,
  onEdit,
  onDuplicate,
  onCancelScope,
  onCancelPayment,
  onDelete,
}: {
  payable: AccountsPayableResponseDTO;
  canCreate: boolean;
  canDelete: boolean;
  canCancelThis: boolean;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancelScope: () => void;
  onCancelPayment: () => void;
  onDelete: () => void;
}) {
  if (payable.status === "PAID" && canCancelThis) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Mais ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4" />
            Visualizar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onCancelPayment}>
            <XCircle className="h-4 w-4" />
            Cancelar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (
    payable.status === "CANCELLED" ||
    (payable.status === "PAID" && !canCancelThis)
  ) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Mais ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4" />
            Visualizar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (payable.status === "PENDING") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Mais ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4" />
            Visualizar
          </DropdownMenuItem>
          {canCreate && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
          )}
          {canCreate && (
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
          )}
          {canCancelThis && payable.recurringBillId && (
            <DropdownMenuItem variant="destructive" onClick={onCancelScope}>
              <XCircle className="h-4 w-4" />
              Cancelar
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}
