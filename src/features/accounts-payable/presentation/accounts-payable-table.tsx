"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Receipt,
  Repeat,
  Trash2,
  XCircle,
} from "lucide-react";
import { useAccountsPayable } from "./use-accounts-payable";
import { useCancelAccountsPayable } from "./use-cancel-accounts-payable";
import { PayAccountsPayableDialog } from "./pay-accounts-payable-dialog";
import { AccountsPayableRecurrenceScopeDialog } from "./accounts-payable-recurrence-scope-dialog";
import { DeleteAccountsPayableDialog } from "./delete-accounts-payable-dialog";
import {
  CATEGORY_COLOR_OVERRIDES,
  STATUS_META,
  formatShortConfirmedAt,
  getAccountsPayableAttachments,
  getDueDateDisplay,
  getPaymentConfirmationDetail,
} from "./accounts-payable-helpers";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { toast } from "sonner";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

export type StatusFilter = "ALL" | "PENDING" | "OVERDUE" | "PAID" | "CANCELLED";

export interface VisibleColumns {
  category: boolean;
  confirmedBy: boolean;
  attachments: boolean;
}

type SortField =
  | "DUE_DATE"
  | "SUPPLIER"
  | "CATEGORY"
  | "AMOUNT"
  | "STATUS"
  | "RECURRING"
  | "CONFIRMED_BY"
  | "ATTACHMENTS";
type SortDirection = "asc" | "desc";

const DUE_DATE_TONE_CLASS: Record<string, string> = {
  danger: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  default: "text-foreground",
};

function SortableHead({
  label,
  field,
  sort,
  onSort,
  align,
  className,
}: {
  label: string;
  field: SortField;
  sort: { field: SortField; direction: SortDirection } | null;
  onSort: (field: SortField) => void;
  align?: "right";
  className?: string;
}) {
  const active = sort?.field === field;
  return (
    <TableHead
      className={cn(
        "text-foreground hover:text-foreground/80 cursor-pointer font-medium transition-colors select-none",
        align === "right" && "text-right",
        className,
      )}
      onClick={() => onSort(field)}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active ? (
          sort.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

export function AccountsPayableTable({
  canPay,
  canCreate,
  canDelete,
  status,
  categoryId,
  supplierId,
  recurringOnly,
  search,
  dueDateFrom,
  dueDateTo,
  visibleColumns,
  onView,
  onEdit,
  onDuplicate,
  onCreateNew,
}: {
  canPay: boolean;
  canCreate: boolean;
  canDelete: boolean;
  status: StatusFilter;
  categoryId?: string;
  supplierId?: string;
  recurringOnly?: "RECURRING" | "NON_RECURRING";
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  visibleColumns: VisibleColumns;
  onView: (
    payable: AccountsPayableResponseDTO,
    tab?: "account" | "history" | "attachments",
  ) => void;
  onEdit: (payable: AccountsPayableResponseDTO) => void;
  onDuplicate: (payable: AccountsPayableResponseDTO) => void;
  onCreateNew: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancelScopeTarget, setCancelScopeTarget] =
    useState<AccountsPayableResponseDTO | null>(null);
  const [deletingTarget, setDeletingTarget] =
    useState<AccountsPayableResponseDTO | null>(null);
  // `null` = sem ordenação (ordem padrão do backend, dueDate asc) — 3º
  // clique numa coluna limpa a ordenação em vez de alternar pra sempre.
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  } | null>(null);

  const { data, isLoading } = useAccountsPayable({
    status: status === "ALL" ? undefined : status,
    categoryId,
    supplierId,
    recurringOnly,
    search,
    dueDateFrom,
    dueDateTo,
    page,
    pageSize,
  });
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const cancelAccountsPayable = useCancelAccountsPayable();

  const supplierById = useMemo(
    () => new Map(suppliers?.map((s) => [s.id, s])),
    [suppliers],
  );
  const categoryById = useMemo(
    () => new Map(categories?.map((c) => [c.id, c])),
    [categories],
  );

  function toggleSort(field: SortField) {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return null;
    });
  }

  const sortedItems = useMemo(() => {
    if (!data) return [];
    if (!sort) return data.items;
    const items = [...data.items];
    const dir = sort.direction === "asc" ? 1 : -1;

    items.sort((a, b) => {
      switch (sort.field) {
        case "AMOUNT":
          return (Number(a.amount) - Number(b.amount)) * dir;
        case "SUPPLIER": {
          const an = supplierById.get(a.supplierId)?.name ?? "";
          const bn = supplierById.get(b.supplierId)?.name ?? "";
          return an.localeCompare(bn) * dir;
        }
        case "CATEGORY": {
          const an = categoryById.get(a.categoryId)?.name ?? "";
          const bn = categoryById.get(b.categoryId)?.name ?? "";
          return an.localeCompare(bn) * dir;
        }
        case "STATUS":
          return (
            STATUS_META[a.displayStatus].label.localeCompare(
              STATUS_META[b.displayStatus].label,
            ) * dir
          );
        case "RECURRING":
          return (
            (Number(a.recurringBillId !== null) -
              Number(b.recurringBillId !== null)) *
            dir
          );
        case "CONFIRMED_BY": {
          const av = getPaymentConfirmationDetail(a)?.userName ?? "";
          const bv = getPaymentConfirmationDetail(b)?.userName ?? "";
          return av.localeCompare(bv) * dir;
        }
        case "ATTACHMENTS":
          return (
            (getAccountsPayableAttachments(a).length -
              getAccountsPayableAttachments(b).length) *
            dir
          );
        case "DUE_DATE":
        default:
          return (
            (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) *
            dir
          );
      }
    });
    return items;
    // supplierById/categoryById são recriados a cada render (vindos de query
    // data) — incluir os dados-fonte como dependência evita comparação por
    // referência instável sem perder reatividade.
  }, [data, sort, supplierById, categoryById]);

  async function handleCancel(
    id: string,
    scope: "SINGLE" | "SERIES" = "SINGLE",
  ) {
    try {
      await cancelAccountsPayable.mutateAsync({ accountsPayableId: id, scope });
      toast.success(
        scope === "SERIES" ? "Recorrência encerrada." : "Conta cancelada.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cancelar.",
      );
    }
  }

  return (
    <>
      {isLoading && (
        <div className="space-y-2 p-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="Nenhuma conta encontrada."
          description="As contas a pagar cadastradas aparecem aqui."
          action={
            canCreate && (
              <Button type="button" size="sm" onClick={onCreateNew}>
                Nova Conta
              </Button>
            )
          }
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    label="Vencimento"
                    field="DUE_DATE"
                    sort={sort}
                    onSort={toggleSort}
                    className="pl-4"
                  />
                  <SortableHead
                    label="Beneficiário"
                    field="SUPPLIER"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  {visibleColumns.category && (
                    <SortableHead
                      label="Categoria"
                      field="CATEGORY"
                      sort={sort}
                      onSort={toggleSort}
                      className="hidden lg:table-cell"
                    />
                  )}
                  <SortableHead
                    label="Valor"
                    field="AMOUNT"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Status"
                    field="STATUS"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHead
                    label="Recorrência"
                    field="RECURRING"
                    sort={sort}
                    onSort={toggleSort}
                    className="hidden lg:table-cell"
                  />
                  {visibleColumns.confirmedBy && (
                    <SortableHead
                      label="Confirmado por"
                      field="CONFIRMED_BY"
                      sort={sort}
                      onSort={toggleSort}
                      className="hidden lg:table-cell"
                    />
                  )}
                  {visibleColumns.attachments && (
                    <SortableHead
                      label="Documentos"
                      field="ATTACHMENTS"
                      sort={sort}
                      onSort={toggleSort}
                      className="hidden lg:table-cell"
                    />
                  )}
                  <TableHead className="pr-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((payable) => {
                  const badge = STATUS_META[payable.displayStatus];
                  const category = categoryById.get(payable.categoryId);
                  const dueDateDisplay = getDueDateDisplay(payable.dueDate);
                  const paymentConfirmation =
                    getPaymentConfirmationDetail(payable);
                  const attachments = getAccountsPayableAttachments(payable);
                  const canPayThis =
                    canPay &&
                    (payable.displayStatus === "PENDING" ||
                      payable.displayStatus === "OVERDUE");
                  // Cancelar só existe pra: (a) conta PAGA (correção
                  // pontual) ou (b) conta PENDENTE que pertence a uma
                  // recorrência (único jeito de "encerrar recorrência").
                  // Conta pendente avulsa usa Excluir, não Cancelar.
                  const canCancelThis =
                    canPay &&
                    ((payable.status === "PENDING" &&
                      payable.recurringBillId) ||
                      payable.status === "PAID");

                  return (
                    <TableRow
                      key={payable.id}
                      className="hover:bg-muted/50 cursor-pointer transition-shadow hover:shadow-[inset_3px_0_0_0_var(--primary)]"
                      onClick={() => onView(payable)}
                    >
                      <TableCell className="pl-4">
                        <p
                          className={cn(
                            "font-medium",
                            DUE_DATE_TONE_CLASS[dueDateDisplay.tone],
                          )}
                        >
                          {dueDateDisplay.top}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {dueDateDisplay.bottom}
                        </p>
                      </TableCell>
                      <TableCell>
                        {supplierById.get(payable.supplierId)?.name ?? "—"}
                      </TableCell>
                      {visibleColumns.category && (
                        <TableCell className="hidden lg:table-cell">
                          {category ? (
                            <Badge
                              variant="outline"
                              className={
                                CATEGORY_COLOR_OVERRIDES[category.name]
                              }
                              style={
                                CATEGORY_COLOR_OVERRIDES[category.name]
                                  ? undefined
                                  : {
                                      borderColor: category.color,
                                      color: category.color,
                                    }
                              }
                            >
                              {category.name}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrencyBRL(payable.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={badge.badgeClassName}
                        >
                          <badge.icon className="h-3 w-3" />
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {payable.recurringBillId ? (
                          <Badge
                            variant="outline"
                            className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                          >
                            <Repeat className="h-3 w-3" />
                            Recorrente
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                      {visibleColumns.confirmedBy && (
                        <TableCell className="hidden lg:table-cell">
                          {paymentConfirmation ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help space-y-0.5">
                                  <p className="text-sm font-medium">
                                    {paymentConfirmation.userName.split(" ")[0]}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatShortConfirmedAt(
                                      paymentConfirmation.confirmedAt,
                                    )}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">
                                  {paymentConfirmation.userName}
                                </p>
                                <p className="text-xs">
                                  Origem: {paymentConfirmation.source}
                                </p>
                                <p className="text-xs">
                                  {formatDateTimeBR(
                                    paymentConfirmation.confirmedAt,
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.attachments && (
                        <TableCell
                          className="hidden lg:table-cell"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {attachments.length === 0 ? (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-sm"
                                  onClick={() => onView(payable, "attachments")}
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                  {attachments.length}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="space-y-0.5">
                                  {attachments.map((attachment) => (
                                    <li key={attachment.url}>
                                      {attachment.name}
                                    </li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                      <TableCell
                        className="pr-4 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {canPayThis ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-green-700 dark:text-green-400"
                              onClick={() => setPayingId(payable.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Pagar
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(payable)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Ver
                            </Button>
                          )}
                          {payable.status === "PAID" && canCancelThis && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Mais ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onView(payable)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleCancel(payable.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {(payable.status === "CANCELLED" ||
                            (payable.status === "PAID" && !canCancelThis)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Mais ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onView(payable)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {payable.status === "PENDING" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Mais ações</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onView(payable)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                {canCreate && (
                                  <DropdownMenuItem
                                    onClick={() => onEdit(payable)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                {canCreate && (
                                  <DropdownMenuItem
                                    onClick={() => onDuplicate(payable)}
                                  >
                                    <Copy className="h-4 w-4" />
                                    Duplicar
                                  </DropdownMenuItem>
                                )}
                                {canCancelThis && payable.recurringBillId && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                      setCancelScopeTarget(payable)
                                    }
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Cancelar
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDeletingTarget(payable)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Mostrando {(data.page - 1) * data.pageSize + 1} a{" "}
              {Math.min(data.page * data.pageSize, data.total)} de {data.total}{" "}
              conta(s)
            </span>
            <div className="flex items-center gap-3">
              <PageNav
                page={data.page}
                totalPages={data.totalPages}
                onChange={setPage}
              />
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <PayAccountsPayableDialog
        accountsPayableId={payingId}
        open={payingId !== null}
        onOpenChange={(open) => !open && setPayingId(null)}
      />

      <AccountsPayableRecurrenceScopeDialog
        open={cancelScopeTarget !== null}
        onOpenChange={(open) => !open && setCancelScopeTarget(null)}
        title="Esta conta pertence a uma recorrência"
        description="Como deseja cancelar?"
        singleLabel="Apenas esta conta"
        seriesLabel="Encerrar recorrência"
        confirmLabel="Confirmar"
        isPending={cancelAccountsPayable.isPending}
        onConfirm={async (scope) => {
          if (!cancelScopeTarget) return;
          await handleCancel(cancelScopeTarget.id, scope);
          setCancelScopeTarget(null);
        }}
      />

      <DeleteAccountsPayableDialog
        payable={deletingTarget}
        open={deletingTarget !== null}
        onOpenChange={(open) => !open && setDeletingTarget(null)}
      />
    </>
  );
}

function buildPageList(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

function PageNav({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Página anterior</span>
      </Button>
      {buildPageList(page, totalPages).map((entry, index) =>
        entry === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="text-muted-foreground px-1.5 text-sm"
          >
            …
          </span>
        ) : (
          <Button
            key={entry}
            type="button"
            variant={entry === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(entry)}
          >
            {entry}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Próxima página</span>
      </Button>
    </div>
  );
}
