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

/**
 * Logo principal (SVG único: ícone + "MedFlow" + tagline) — asset de
 * marca pronto, colorido no tema claro e branco no tema escuro via
 * `dark:fill-*` direto nas formas do SVG, sem depender de token de
 * `Card`/tema por fora. Usado no card ao lado do Resumo do Dia na
 * Caixa Recepção.
 */
export function LogoPrincipal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 140"
      className={cn("h-11 w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MedFlow — Gestão financeira inteligente para clínicas"
    >
      <rect
        x="15"
        y="90"
        width="22"
        height="45"
        rx="8"
        className="fill-[#93C5FD] dark:fill-white"
      />
      <rect
        x="44"
        y="65"
        width="22"
        height="70"
        rx="8"
        className="fill-[#60A5FA] dark:fill-white"
      />
      <rect
        x="73"
        y="40"
        width="22"
        height="95"
        rx="8"
        className="fill-[#3B82F6] dark:fill-white"
      />
      <rect
        x="102"
        y="15"
        width="22"
        height="120"
        rx="8"
        className="fill-[#2563EB] dark:fill-white"
      />

      <text x="145" y="98" className="font-sans text-[70px] font-bold">
        <tspan className="fill-[#1E3A8A] dark:fill-white">Med</tspan>
        <tspan className="fill-[#2563EB] dark:fill-white">Flow</tspan>
      </text>

      <text
        x="147"
        y="126"
        className="fill-[#64748B] font-sans text-[15px] dark:fill-slate-300"
      >
        Gestão financeira inteligente para clínicas
      </text>
    </svg>
  );
}

/** Lockup vertical (ícone em cima, "MedFlow" e a tagline embaixo, tudo centralizado) — variante "Vertical (Colorida)" do manual da marca; usado em espaços estreitos e altos, ex: painel lateral da Caixa Recepção. */
export function LogoVertical({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col items-center gap-2 text-center", className)}
    >
      <LogoIcon className="h-10 w-auto" />
      <span className="text-lg leading-none font-bold tracking-tight">
        <span className="text-foreground">Med</span>
        <span className="text-primary">Flow</span>
      </span>
      <span className="text-muted-foreground text-xs">
        Gestão financeira inteligente para clínicas
      </span>
    </div>
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
