import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function KpiCard({
  label,
  value,
  tone = "default",
  icon: Icon,
  comparison,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  icon?: LucideIcon;
  comparison?: string;
}) {
  return (
    <Card className="hover:border-ring/40 py-4 transition-colors">
      <CardHeader className="flex-row items-center justify-between space-y-0 px-4 pb-0">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {label}
        </CardTitle>
        {Icon && <Icon className="text-muted-foreground h-4 w-4" />}
      </CardHeader>
      <CardContent className="px-4">
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight",
            tone === "positive" && "text-green-600 dark:text-green-500",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>
        {comparison && (
          <p className="text-muted-foreground mt-1 text-xs">{comparison}</p>
        )}
      </CardContent>
    </Card>
  );
}
