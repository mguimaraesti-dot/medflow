"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashFlowInsightsResponseDTO } from "../application/dtos/cash-flow-insights.response-dto";

export function RevenueByCategoryChart({
  byCategory,
}: {
  byCategory: CashFlowInsightsResponseDTO["byCategory"];
}) {
  const data = byCategory.map((category) => ({
    name: category.categoryName,
    value: Number(category.total),
    color: category.color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Origem das receitas</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma entrada registrada hoje.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrencyBRL(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
