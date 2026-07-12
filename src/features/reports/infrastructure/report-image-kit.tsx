import { readFileSync } from "fs";
import { join } from "path";

/**
 * Peças reaproveitadas por todos os Status Reports (imagens 1080x1920
 * geradas via `next/og`/Satori): paleta de cores, ícones desenhados à
 * mão (Satori só renderiza um subconjunto de SVG, sem lucide-react) e o
 * logo da Clínica MAE embutido como data URI.
 */
export const BLUE = "#2563EB";
export const GREEN = "#16A34A";
export const RED = "#EF4444";
export const ORANGE = "#F59E0B";
export const LIGHT_GRAY = "#F3F4F6";
export const DARK_TEXT = "#1F2937";
export const MUTED_TEXT = "#6B7280";
export const BORDER = "#E5E7EB";
export const GREEN_BG = "#ECFDF5";

/**
 * Logo da Clínica MAE (único cliente do MVP hoje — CLAUDE.md) embutido
 * como asset estático da feature. Se o MedFlow virar multiempresa de
 * verdade, isso precisa virar um upload por organização; por ora, um
 * arquivo fixo é a solução certa pro escopo atual.
 */
let cachedLogoDataUri: string | null = null;
export function loadOrganizationLogoDataUri(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const filePath = join(
    process.cwd(),
    "src/features/reports/infrastructure/assets/clinica-mae-logo.jpeg",
  );
  const base64 = readFileSync(filePath).toString("base64");
  cachedLogoDataUri = `data:image/jpeg;base64,${base64}`;
  return cachedLogoDataUri;
}

/** Ícones em linha (stroke, sem preenchimento) — desenhados à mão em vez de reaproveitar o lucide-react (Satori não roda). */
export function Icon({
  path,
  color,
  size = 20,
}: {
  path: string;
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export const ICON_PATHS = {
  calendar:
    "M8 2v4M16 2v4M3.5 9h17M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  clock: "M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  wallet:
    "M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z M16 14h.01",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  barChart: "M4 20V10M12 20V4M20 20v-6",
  trendingUp: "M4 17l6-6 4 4 7-8M15 6h6v6",
  trendingDown: "M4 7l6 6 4-4 7 8M21 11v6h-6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 4-6 8-6s8 2 8 6",
  shield: "M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6Z M9.5 12l1.7 1.7 3.3-3.4",
  receipt: "M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z M9 8h6M9 12h6",
  zap: "M13 2 4 14h6l-1 8 9-12h-6z",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  sliders: "M4 6h6M14 6h6M4 12h10M18 12h2M4 18h4M12 18h8",
  banknote:
    "M2 7h20v10H2V7Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 9v.01M18 15v-.01",
  fileText:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6M8 13h8M8 17h8M8 9h2",
  bank: "M3 21h18M4 10h16M12 3 2 8h20L12 3ZM6 10v8M10 10v8M14 10v8M18 10v8",
  medal: "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.5 13.5 6 21l6-3 6 3-2.5-7.5",
};

export function MedFlowIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="18" width="7" height="12" rx="2.5" fill="#60A5FA" />
      <rect x="12.5" y="10" width="7" height="20" rx="2.5" fill="#2563EB" />
      <rect x="23" y="2" width="7" height="28" rx="2.5" fill="#1E3A8A" />
    </svg>
  );
}
