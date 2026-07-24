import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type IconTone = "blue" | "green" | "red" | "amber" | "violet" | "slate";

/**
 * Tokens semânticos do design system (`globals.css`, expostos via
 * `@theme inline`) — blue/green/red/amber mapeiam 1:1 pra
 * primary/success/destructive/warning. `violet` e `slate` NÃO têm token
 * equivalente hoje (não existe `--violet` nem um `--neutral` dedicado
 * além do `--muted` já usado por slate) — mantidos como Tailwind
 * literal/`muted`, sem inventar token novo.
 */
const ICON_TONE_CLASSES: Record<IconTone, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/10 text-success",
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-500",
  slate: "bg-muted text-muted-foreground",
};

/** Mesma paleta que `ICON_TONE_CLASSES`, aplicada ao texto do valor (sem o fundo tonalizado). */
const TONE_VALUE_CLASSES: Record<IconTone, string> = {
  blue: "text-primary",
  green: "text-success",
  red: "text-destructive",
  amber: "text-warning",
  violet: "text-violet-600 dark:text-violet-500",
  slate: "text-muted-foreground",
};

const TONE_RING_CLASSES: Record<IconTone, string> = {
  blue: "ring-primary",
  green: "ring-success",
  red: "ring-destructive",
  amber: "ring-warning",
  violet: "ring-violet-500",
  slate: "ring-muted-foreground",
};

const TONE_BORDER_CLASSES: Record<IconTone, string> = {
  blue: "border-primary/50",
  green: "border-success/50",
  red: "border-destructive/50",
  amber: "border-warning/50",
  violet: "border-violet-500/50",
  slate: "border-muted-foreground/50",
};

export function KpiCard({
  label,
  value,
  tone = "default",
  icon: Icon,
  iconTone,
  comparison,
  compact,
  onClick,
  active,
  emphasized,
  emphasizeIconOnly,
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
  /** Card vira um atalho de filtro clicável (Sprint UX/UI 11) — sem isso, card só exibe (comportamento original). */
  onClick?: () => void;
  /** Anel colorido (usa `iconTone`) — indica que este card é o filtro atualmente aplicado. */
  active?: boolean;
  /**
   * Destaque condicionado a "tem valor" (ex: contas vencidas > 0).
   * `true` → ícone + borda + valor na cor de `iconTone` ("aceso").
   * `false` → ícone força pro tom neutro/muted, sem borda, valor sem
   * tingimento ("apagado" — nada de alarme falso com R$ 0,00).
   * `undefined` (prop nem passada) → comportamento antigo, sempre
   * colorido, sem gating (usado por telas que não têm essa noção de
   * "categoria vazia", ex: Tesouraria).
   */
  emphasized?: boolean;
  /** Quando `emphasized` está aceso, tinge só o ícone — o valor numérico nunca muda de cor (usado por "Pagas": não deve competir visualmente com vermelho/âmbar). */
  emphasizeIconOnly?: boolean;
}) {
  const effectiveIconTone: IconTone | undefined =
    emphasized === false ? "slate" : iconTone;
  const tintValue = emphasized === true && iconTone && !emphasizeIconOnly;

  return (
    <Card
      className={cn(
        "hover:border-ring/40 transition-colors",
        compact ? "py-2.5" : "py-4",
        onClick && "cursor-pointer",
        active &&
          iconTone &&
          cn("ring-2 ring-offset-1", TONE_RING_CLASSES[iconTone]),
        !active && emphasized && iconTone && TONE_BORDER_CLASSES[iconTone],
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
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
          (effectiveIconTone ? (
            <span
              className={cn(
                "flex items-center justify-center rounded-lg",
                compact ? "h-6 w-6" : "h-8 w-8",
                ICON_TONE_CLASSES[effectiveIconTone],
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
            tintValue && TONE_VALUE_CLASSES[iconTone],
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
