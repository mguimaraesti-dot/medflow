"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useSafeMovements } from "./use-safe-movements";
import { SafeMovementDetailDrawer } from "./safe-movement-detail-drawer";
import { ConfirmSafeMovementDialog } from "./confirm-safe-movement-dialog";
import { CancelSafeMovementDialog } from "./cancel-safe-movement-dialog";
import { describeMovement, isMovementIn } from "./safe-movement-display";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import type { SafeMovementResponseDTO } from "../application/dtos/safe-movement.response-dto";

/**
 * Pendências SEMPRE visíveis, ACIMA da linha de ações rápidas (Receber/
 * Saída/Ajuste) — mostra a TAREFA antes das FERRAMENTAS, pra evitar o
 * erro real já registrado 2x: gerente clicando em "Receber do Caixa"
 * querendo confirmar um recebimento pendente, sem nem ver que ele
 * existia (a seção ficava embaixo dos botões). Só `CASH_REGISTER_
 * HANDOFF` nasce PENDING — o "N" aqui é o mesmo universo (organização
 * inteira, sem outro filtro) do KPI "Pendentes de Confirmação",
 * garantindo que os dois números batam. Renderiza igual em mobile e
 * desktop — a lista costuma ter 0-1 item, não precisa de tabela.
 */
export function PendingHandoffsSection({
  canConfirm,
}: {
  canConfirm: boolean;
}) {
  const [selected, setSelected] = useState<SafeMovementResponseDTO | null>(
    null,
  );
  const [confirmTarget, setConfirmTarget] =
    useState<SafeMovementResponseDTO | null>(null);
  const [cancelTarget, setCancelTarget] =
    useState<SafeMovementResponseDTO | null>(null);

  const { data } = useSafeMovements({
    status: "PENDING",
    page: 1,
    pageSize: 200,
  });

  if (!data || data.items.length === 0) return null;

  return (
    <>
      <div className="space-y-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-3.5">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-500">
          <AlertCircle className="h-4 w-4" />
          Aguardando confirmação ({data.total})
        </h3>
        <div className="flex flex-col gap-2">
          {data.items.map((movement) => {
            const isIn = isMovementIn(movement);

            return (
              <div
                key={movement.id}
                className="bg-card cursor-pointer rounded-lg border p-3 shadow-sm"
                onClick={() => setSelected(movement)}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatDateTimeBR(movement.createdAt)}
                  </p>
                  <p
                    className={
                      "text-[16.5px] font-semibold tabular-nums " +
                      (isIn ? "text-success" : "text-destructive")
                    }
                  >
                    {isIn ? "+" : "-"}
                    {formatCurrencyBRL(movement.amount.replace("-", ""))}
                  </p>
                </div>

                <p className="mb-2 text-[15px] font-medium">
                  {describeMovement(movement)}
                </p>

                {canConfirm && (
                  <div
                    className="flex gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={() => setConfirmTarget(movement)}
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/45 text-destructive flex-1"
                      onClick={() => setCancelTarget(movement)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SafeMovementDetailDrawer
        movement={selected}
        canConfirm={canConfirm}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
      <ConfirmSafeMovementDialog
        movement={confirmTarget}
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      />
      <CancelSafeMovementDialog
        movement={cancelTarget}
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />
    </>
  );
}
