"use client";

import { useState } from "react";
import { Vault } from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useSafeSummary } from "./use-safe-summary";
import { SafeMovementsTable } from "./safe-movements-table";
import { SangriaDialog } from "./sangria-dialog";
import { WithdrawalDialog } from "./withdrawal-dialog";
import { ManualAdjustmentDialog } from "./manual-adjustment-dialog";
import {
  PeriodSelector,
  computePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Tesouraria (Controle do Cofre) — reformulada pra máxima produtividade
 * (Refinamento UX/UI): um único card de saldo em destaque, 3 ações com o
 * mesmo peso visual, e a tabela de movimentações sem jargão interno
 * (Sangria/Aporte/Recolhimento viram só "Entrada"/"Saída"). Sem alterar
 * API, banco ou regra de negócio — apenas reorganização de interface.
 */
export function TreasuryScreen({ permissions }: { permissions: string[] }) {
  const can = (permission: string) => permissions.includes(permission);
  const canReceive = can(PERMISSIONS.TREASURY_SANGRIA);
  const canManualAdjustment = can(PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();

  const range = computePeriodRange(periodPreset, periodCustom);
  const { data: safe } = useSafeSummary();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PeriodSelector
          preset={periodPreset}
          custom={periodCustom}
          variant="select"
          onChange={(preset, custom) => {
            setPeriodPreset(preset);
            setPeriodCustom(custom);
          }}
        />
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex items-center justify-between gap-6 p-8">
          <div>
            <p className="text-muted-foreground text-sm">Saldo do Cofre</p>
            <p className="text-5xl font-bold tracking-tight">
              {safe ? formatCurrencyBRL(safe.balance) : "—"}
            </p>
          </div>
          <div className="bg-success/10 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Vault className="text-success h-8 w-8" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        {canReceive && <SangriaDialog />}
        {canManualAdjustment && <WithdrawalDialog />}
        {canManualAdjustment && <ManualAdjustmentDialog />}
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold">Movimentações do Cofre</h2>
          <SafeMovementsTable
            createdAtFrom={range.from}
            createdAtTo={range.to}
          />
        </CardContent>
      </Card>
    </div>
  );
}
