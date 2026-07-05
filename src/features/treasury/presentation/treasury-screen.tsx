"use client";

import { useState } from "react";
import { Vault } from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useSafeSummary } from "./use-safe-summary";
import {
  SafeMovementsTable,
  type SafeMovementTypeFilter,
} from "./safe-movements-table";
import { SangriaDialog } from "./sangria-dialog";
import { ManualAdjustmentDialog } from "./manual-adjustment-dialog";
import {
  PeriodSelector,
  computePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import { KpiCard } from "@/shared/components/kpi-card";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export function TreasuryScreen({ permissions }: { permissions: string[] }) {
  const can = (permission: string) => permissions.includes(permission);
  const canSangria = can(PERMISSIONS.TREASURY_SANGRIA);
  const canManualAdjustment = can(PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [type, setType] = useState<SafeMovementTypeFilter>("ALL");

  const range = computePeriodRange(periodPreset, periodCustom);
  const { data: safe } = useSafeSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tesouraria</h2>
          <p className="text-muted-foreground text-sm">
            Saldo do Cofre e histórico de movimentações.
          </p>
        </div>
        <PeriodSelector
          preset={periodPreset}
          custom={periodCustom}
          onChange={(preset, custom) => {
            setPeriodPreset(preset);
            setPeriodCustom(custom);
          }}
        />
      </div>

      {safe && (
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <KpiCard
            label="Saldo do Cofre"
            value={formatCurrencyBRL(safe.balance)}
            icon={Vault}
            iconTone="green"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={type}
          onValueChange={(value) => setType(value as SafeMovementTypeFilter)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="FUNDING">Aportes</SelectItem>
            <SelectItem value="SANGRIA">Sangrias</SelectItem>
            <SelectItem value="CASH_REGISTER_HANDOFF">Recolhimentos</SelectItem>
            <SelectItem value="MANUAL_ADJUSTMENT">Ajustes manuais</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-2">
          {canSangria && <SangriaDialog />}
          {canManualAdjustment && <ManualAdjustmentDialog />}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SafeMovementsTable
            type={type}
            createdAtFrom={range.from}
            createdAtTo={range.to}
          />
        </CardContent>
      </Card>
    </div>
  );
}
