"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { PayAccountsPayableDialog } from "./pay-accounts-payable-dialog";
import { DeleteAccountsPayableDialog } from "./delete-accounts-payable-dialog";
import {
  STATUS_META,
  getAccountsPayableAttachments,
  getDueDateDisplay,
  getPaymentConfirmationDetail,
  getRecurrenceDisplay,
  toAccountsPayableEvents,
} from "./accounts-payable-helpers";
import { useRecurringBill } from "./use-recurring-bill";
import { useAccountsPayableAuditLog } from "./use-accounts-payable-audit-log";
import { useRecurringBillOccurrences } from "./use-recurring-bill-occurrences";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatDateTimeBR,
} from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function AccountsPayableDrawer({
  payable,
  supplierName,
  categoryName,
  canPay = false,
  canEdit = false,
  canDelete = false,
  open,
  onOpenChange,
  onEdit,
}: {
  payable: AccountsPayableResponseDTO | null;
  supplierName?: string;
  categoryName?: string;
  canPay?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (payable: AccountsPayableResponseDTO) => void;
}) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: recurringBill } = useRecurringBill(
    payable?.recurringBillId ?? null,
  );
  const recurrenceDisplay =
    payable && recurringBill
      ? getRecurrenceDisplay(recurringBill, payable.occurrenceNumber)
      : null;

  const { data: occurrencesResult } = useRecurringBillOccurrences(
    payable?.recurringBillId ?? null,
  );
  const occurrences = occurrencesResult?.items ?? [];

  const { data: auditLog } = useAccountsPayableAuditLog(payable?.id ?? null);
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const supplierById = useMemo(
    () => new Map(suppliers?.map((s) => [s.id, s])),
    [suppliers],
  );
  const categoryById = useMemo(
    () => new Map(categories?.map((c) => [c.id, c])),
    [categories],
  );
  const events = auditLog
    ? toAccountsPayableEvents(auditLog, {
        supplierById,
        categoryById,
        isRecurring: payable?.recurringBillId != null,
      })
    : [];

  const badge = payable ? STATUS_META[payable.displayStatus] : null;
  const dueDateDisplay = payable ? getDueDateDisplay(payable.dueDate) : null;
  const attachments = payable ? getAccountsPayableAttachments(payable) : [];
  const paymentConfirmation = payable
    ? getPaymentConfirmationDetail(payable)
    : null;
  const canPayThis =
    canPay &&
    payable !== null &&
    (payable.displayStatus === "PENDING" ||
      payable.displayStatus === "OVERDUE");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-lg"
        >
          {payable && badge && dueDateDisplay && (
            <>
              <SheetHeader className="space-y-3 pb-2">
                <Badge
                  variant="outline"
                  className={cn("w-fit", badge.badgeClassName)}
                >
                  {badge.label}
                </Badge>
                <div>
                  <p className="text-muted-foreground text-xs">Conta a Pagar</p>
                  <SheetTitle className="text-xl">
                    {supplierName ?? payable.description}
                  </SheetTitle>
                </div>
                <p className="text-primary text-2xl font-semibold">
                  {formatCurrencyBRL(payable.amount)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {dueDateDisplay.tone === "danger" ? "Venceu" : "Vence"}{" "}
                  {dueDateDisplay.top.toLowerCase()} · {dueDateDisplay.bottom}
                </p>
              </SheetHeader>

              <Tabs
                defaultValue="account"
                className="flex min-h-0 flex-1 flex-col"
              >
                <TabsList variant="line" className="mx-4">
                  <TabsTrigger value="account">Conta</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                  <TabsTrigger value="attachments">Documentos</TabsTrigger>
                  {payable.recurringBillId && (
                    <TabsTrigger value="occurrences">
                      Próximas Ocorrências
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <TabsContent value="account" className="mt-4 space-y-4">
                    <p className="text-sm font-medium">
                      Informações principais
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Fornecedor" value={supplierName ?? "—"} />
                      <Field label="Categoria" value={categoryName ?? "—"} />
                      <Field
                        label="Vencimento"
                        value={
                          <span className="flex items-center gap-1.5">
                            {dueDateDisplay.bottom}
                            {(dueDateDisplay.tone === "warning" ||
                              dueDateDisplay.tone === "danger") && (
                              <Badge
                                variant="outline"
                                className={
                                  dueDateDisplay.tone === "danger"
                                    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                }
                              >
                                {dueDateDisplay.top}
                              </Badge>
                            )}
                          </span>
                        }
                      />
                      <Field
                        label="Confirmado por"
                        value={paymentConfirmation?.userName ?? "—"}
                      />
                    </div>

                    {paymentConfirmation && (
                      <div className="space-y-2 rounded-lg border p-3">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                          Confirmado por {paymentConfirmation.userName}
                        </p>
                        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                          <span>Origem: {paymentConfirmation.source}</span>
                          <span>
                            Em:{" "}
                            {formatDateTimeBR(paymentConfirmation.confirmedAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    {recurrenceDisplay && (
                      <div className="space-y-2 rounded-lg border p-3">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          <Repeat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          Recorrente
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <Field
                            label="Periodicidade"
                            value={recurrenceDisplay.periodicityLabel}
                          />
                          <Field
                            label="Ocorrência"
                            value={recurrenceDisplay.occurrenceLabel}
                          />
                          <Field
                            label="Início"
                            value={recurrenceDisplay.startLabel}
                          />
                          <Field
                            label="Fim"
                            value={recurrenceDisplay.endLabel}
                          />
                        </div>
                      </div>
                    )}

                    <Field
                      label="Observação"
                      value={payable.description || "—"}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    <ol className="space-y-4">
                      {events.map((event, index) => (
                        <li key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                              <event.icon className="h-3.5 w-3.5" />
                            </span>
                            {index < events.length - 1 && (
                              <span className="bg-border mt-1 w-px flex-1" />
                            )}
                          </div>
                          <div className="-mt-0.5 pb-3">
                            <p className="text-sm font-medium">{event.label}</p>
                            <p className="text-muted-foreground text-xs">
                              Por {event.actor} · {formatDateTimeBR(event.date)}
                            </p>
                            {event.detail && (
                              <p className="text-muted-foreground text-xs">
                                {event.detail}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </TabsContent>

                  <TabsContent value="attachments" className="mt-4">
                    {attachments.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="Nenhum documento."
                        description="Documentos vinculados a esta conta (ex: boleto) aparecem aqui."
                      />
                    ) : (
                      <ul className="space-y-2">
                        {attachments.map((attachment) => (
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
                  </TabsContent>

                  {payable.recurringBillId && (
                    <TabsContent value="occurrences" className="mt-4">
                      {occurrences.length === 0 ? (
                        <EmptyState
                          icon={Repeat}
                          title="Nenhuma ocorrência encontrada."
                          description="As próximas contas geradas por esta recorrência aparecem aqui."
                        />
                      ) : (
                        <ul className="space-y-2">
                          {occurrences.map((occurrence) => {
                            const occurrenceBadge =
                              STATUS_META[occurrence.displayStatus];
                            const isCurrent = occurrence.id === payable.id;
                            return (
                              <li
                                key={occurrence.id}
                                className={cn(
                                  "flex items-center justify-between rounded-lg border p-3",
                                  isCurrent && "border-primary/50 bg-primary/5",
                                )}
                              >
                                <div>
                                  <p className="flex items-center gap-1.5 text-sm font-medium">
                                    {formatDateOnlyBR(occurrence.dueDate)}
                                    {isCurrent && (
                                      <Badge
                                        variant="outline"
                                        className="text-primary border-primary/30"
                                      >
                                        Atual
                                      </Badge>
                                    )}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {formatCurrencyBRL(occurrence.amount)}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={occurrenceBadge.badgeClassName}
                                >
                                  {occurrenceBadge.label}
                                </Badge>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </TabsContent>
                  )}
                </div>
              </Tabs>

              {(canPayThis || canEdit || canDelete) && (
                <div className="flex gap-2 border-t p-4">
                  {canPayThis && (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => setPayingId(payable.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar pagamento
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      className={canPayThis ? "" : "flex-1"}
                      onClick={() => onEdit?.(payable)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar conta
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <PayAccountsPayableDialog
        accountsPayableId={payingId}
        open={payingId !== null}
        onOpenChange={(open) => !open && setPayingId(null)}
      />

      <DeleteAccountsPayableDialog
        payable={payable}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={() => onOpenChange(false)}
      />
    </>
  );
}
