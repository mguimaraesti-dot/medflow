"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashFlowInsightsResponseDTO } from "../application/dtos/cash-flow-insights.response-dto";

export function RevenueByHourChart({
  byHour,
}: {
  byHour: CashFlowInsightsResponseDTO["byHour"];
}) {
  const data = byHour.map((entry) => ({
    hour: `${String(entry.hour).padStart(2, "0")}h`,
    entradas: Number(entry.total),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entradas por hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="hour" fontSize={11} interval={2} />
              <YAxis fontSize={11} width={48} />
              <Tooltip
                formatter={(value) => formatCurrencyBRL(Number(value))}
              />
              <Bar dataKey="entradas" fill="#16A34A" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
