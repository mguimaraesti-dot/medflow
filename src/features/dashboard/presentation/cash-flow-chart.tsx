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
import type { DashboardDailyTotalResponseDTO } from "../application/dtos/dashboard-summary.response-dto";

function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

export function CashFlowChart({
  dailySeries,
}: {
  dailySeries: DashboardDailyTotalResponseDTO[];
}) {
  const data = dailySeries.map((day) => ({
    date: formatShortDate(day.date),
    entradas: Number(day.totalIn),
    saidas: Number(day.totalOut),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos 30 dias</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" fontSize={12} interval="preserveStartEnd" />
              <YAxis fontSize={12} width={48} />
              <Tooltip
                formatter={(value) => formatCurrencyBRL(Number(value))}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Bar dataKey="entradas" fill="#16A34A" radius={[2, 2, 0, 0]} />
              <Bar dataKey="saidas" fill="#DC2626" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
