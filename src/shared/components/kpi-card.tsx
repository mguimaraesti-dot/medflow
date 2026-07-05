import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type IconTone = "blue" | "green" | "red" | "amber" | "violet" | "slate";

const ICON_TONE_CLASSES: Record<IconTone, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-500",
  red: "bg-red-500/10 text-red-600 dark:text-red-500",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-500",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export function KpiCard({
  label,
  value,
  tone = "default",
  icon: Icon,
  iconTone,
  comparison,
  compact,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  icon?: LucideIcon;
  /** Chip colorido atrás do ícone (Design Pass) — sem isso, ícone simples (comportamento original). */
  iconTone?: IconTone;
  comparison?: ReactNode;
  /** Versão ~25% mais baixa (menos padding, texto menor) — usada em telas onde a tabela precisa de mais espaço. */
  compact?: boolean;
}) {
  return (
    <Card
      className={cn(
        "hover:border-ring/40 transition-colors",
        compact ? "py-2.5" : "py-4",
      )}
    >
      <CardHeader
        className={cn(
          "flex-row items-center justify-between space-y-0 px-4 pb-0",
          compact && "pt-0",
        )}
      >
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {label}
        </CardTitle>
        {Icon &&
          (iconTone ? (
            <span
              className={cn(
                "flex items-center justify-center rounded-lg",
                compact ? "h-6 w-6" : "h-8 w-8",
                ICON_TONE_CLASSES[iconTone],
              )}
            >
              <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </span>
          ) : (
            <Icon className="text-muted-foreground h-4 w-4" />
          ))}
      </CardHeader>
      <CardContent className={cn("px-4", compact && "pb-0")}>
        <p
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-lg" : "text-2xl",
            tone === "positive" && "text-green-600 dark:text-green-500",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>
        {comparison && (
          <div
            className={cn(
              "text-muted-foreground text-xs",
              compact ? "mt-0.5" : "mt-1",
            )}
          >
            {comparison}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
