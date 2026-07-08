"use client";

import {
  Ban,
  CheckCircle2,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { SupplierResponseDTO } from "../application/dtos/supplier.response-dto";

const PERSON_TYPE_META: Record<
  SupplierResponseDTO["personType"],
  { label: string; className: string }
> = {
  PESSOA_JURIDICA: {
    label: "Pessoa Jurídica",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  PESSOA_FISICA: {
    label: "Pessoa Física",
    className:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
};

function linkedAccountsLabel(count: number): string {
  if (count === 0) return "Nenhuma";
  return `${count} ${count === 1 ? "conta" : "contas"}`;
}

export function SuppliersTable({
  suppliers,
  canEdit,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDeleteRequest,
}: {
  suppliers: SupplierResponseDTO[];
  canEdit: boolean;
  onEdit: (supplier: SupplierResponseDTO) => void;
  onDuplicate: (supplier: SupplierResponseDTO) => void;
  onToggleActive: (supplier: SupplierResponseDTO) => void;
  onDeleteRequest: (supplier: SupplierResponseDTO) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Beneficiário</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Contas Vinculadas</TableHead>
          <TableHead>Status</TableHead>
          {canEdit && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => {
          const personType = PERSON_TYPE_META[supplier.personType];
          const hasLinkedRecords =
            supplier.accountsPayableCount > 0 ||
            supplier.hasLinkedRecurringBills;

          return (
            <TableRow
              key={supplier.id}
              className={
                canEdit
                  ? "hover:bg-muted/50 cursor-pointer transition-shadow hover:shadow-[inset_3px_0_0_0_var(--primary)]"
                  : undefined
              }
              onClick={canEdit ? () => onEdit(supplier) : undefined}
            >
              <TableCell>
                <p className="font-medium">{supplier.name}</p>
                {supplier.document && (
                  <p className="text-muted-foreground text-xs">
                    {supplier.document}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={personType.className}>
                  {personType.label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {supplier.phone || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {linkedAccountsLabel(supplier.accountsPayableCount)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    supplier.active
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500"
                      : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  }
                >
                  {supplier.active ? "🟢 Ativo" : "⚪ Inativo"}
                </Badge>
              </TableCell>
              {canEdit && (
                <TableCell
                  className="text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Mais ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(supplier)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(supplier)}>
                        <Copy className="h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onToggleActive(supplier)}
                      >
                        {supplier.active ? (
                          <>
                            <Ban className="h-4 w-4" />
                            Inativar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Reativar
                          </>
                        )}
                      </DropdownMenuItem>
                      {hasLinkedRecords ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <DropdownMenuItem
                                variant="destructive"
                                disabled
                                onSelect={(event) => event.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Este beneficiário possui contas vinculadas e não
                            pode ser excluído.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDeleteRequest(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
