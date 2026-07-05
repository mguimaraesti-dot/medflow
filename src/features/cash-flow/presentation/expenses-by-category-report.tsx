"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useExpensesByCategory } from "./use-expenses-by-category";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { EmptyState } from "@/shared/components/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent } from "@/shared/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";

export function ExpensesByCategoryReport({
  dateFrom,
  dateTo,
}: {
  dateFrom: Date;
  dateTo: Date;
}) {
  const { data, isLoading } = useExpensesByCategory({ dateFrom, dateTo });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="Nenhuma despesa encontrada no período."
        description="As despesas por categoria aparecem aqui."
      />
    );
  }

  const sorted = [...data].sort((a, b) => Number(b.total) - Number(a.total));
  const chartData = sorted.map((item) => ({
    name: item.categoryName,
    value: Number(item.total),
    color: item.color,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrencyBRL(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {sorted.map((item) => (
            <div
              key={item.categoryId}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.categoryName}
              </span>
              <span className="font-medium">
                {formatCurrencyBRL(item.total)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
