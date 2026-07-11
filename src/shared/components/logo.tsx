import { cn } from "@/shared/lib/utils";

/**
 * Ícone da marca (3 barras ascendentes), do Manual da Marca MedFlow.
 * `tone="brand"` usa as cores da paleta oficial (clara → escura, da
 * esquerda pra direita); `tone="mono"` herda `currentColor` (com
 * opacidade nas barras pra manter a hierarquia visual mesmo em uma cor
 * só); `tone="white"` é a variante pra fundos escuros/cor.
 */
function LogoIcon({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "white" | "mono";
}) {
  const bar1 =
    tone === "brand"
      ? "#60A5FA"
      : tone === "white"
        ? "#FFFFFF"
        : "currentColor";
  const bar2 =
    tone === "brand"
      ? "#2563EB"
      : tone === "white"
        ? "#FFFFFF"
        : "currentColor";
  const bar3 =
    tone === "brand"
      ? "#1E3A8A"
      : tone === "white"
        ? "#FFFFFF"
        : "currentColor";
  const bar1Opacity = tone === "brand" ? 1 : 0.55;
  const bar2Opacity = tone === "brand" ? 1 : 0.8;

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-6 w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x={2}
        y={18}
        width={7}
        height={12}
        rx={2.5}
        fill={bar1}
        opacity={bar1Opacity}
      />
      <rect
        x={12.5}
        y={10}
        width={7}
        height={20}
        rx={2.5}
        fill={bar2}
        opacity={bar2Opacity}
      />
      <rect x={23} y={2} width={7} height={28} rx={2.5} fill={bar3} />
    </svg>
  );
}

/** Logo horizontal (ícone + wordmark) — "Med" no texto, "Flow" na cor primária. */
export function Logo({
  className,
  iconClassName,
  showText = true,
}: {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcon className={cn("h-6 w-auto", iconClassName)} />
      {showText && (
        <span className="text-lg leading-none font-bold tracking-tight">
          <span className="text-foreground">Med</span>
          <span className="text-primary">Flow</span>
        </span>
      )}
    </span>
  );
}

/** Emblema quadrado (ícone branco sobre fundo primário) — variante "Branco" do manual. */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary flex h-10 w-10 items-center justify-center rounded-xl",
        className,
      )}
    >
      <LogoIcon tone="white" className="h-5 w-auto" />
    </span>
  );
}
