import { cn } from "@/shared/lib/utils";

/**
 * Ícone da marca (pulso + barras ascendentes), do Manual da Marca MedFlow.
 * `tone="brand"` usa as cores da paleta oficial; `tone="mono"` herda
 * `currentColor` (com opacidade nas barras pra manter a hierarquia visual
 * mesmo em uma cor só); `tone="white"` é a variante pra fundos escuros/cor.
 */
export function LogoIcon({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "white" | "mono";
}) {
  const pulseColor =
    tone === "brand"
      ? "#2563EB"
      : tone === "white"
        ? "#FFFFFF"
        : "currentColor";
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
      viewBox="0 0 56 32"
      className={cn("h-6 w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2,16 H10 L14,4 L19,28 L24,10 L28,20 H32"
        fill="none"
        stroke={pulseColor}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x={36}
        y={20}
        width={4}
        height={8}
        rx={2}
        fill={bar1}
        opacity={bar1Opacity}
      />
      <rect
        x={42}
        y={14}
        width={4}
        height={14}
        rx={2}
        fill={bar2}
        opacity={bar2Opacity}
      />
      <rect x={48} y={8} width={4} height={20} rx={2} fill={bar3} />
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
