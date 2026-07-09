"use client";

import Link from "next/link";
import { Landmark, Receipt, Wallet, FilePlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { cn } from "@/shared/lib/utils";

type QuickActionTone = "green" | "blue" | "purple" | "red";

const TONE_ICON_CLASSES: Record<QuickActionTone, string> = {
  green: "text-green-600 dark:text-green-500",
  blue: "text-blue-600 dark:text-blue-400",
  purple: "text-violet-600 dark:text-violet-400",
  red: "text-red-600 dark:text-red-500",
};

function QuickActionButton({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone: QuickActionTone;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted/60 flex flex-1 items-center justify-center gap-2 rounded-lg border p-3.5 text-sm font-semibold transition-colors"
    >
      <Icon className={cn("h-4 w-4", TONE_ICON_CLASSES[tone])} />
      {label}
    </Link>
  );
}

export function DashboardQuickActions({
  permissions,
}: {
  permissions: string[];
}) {
  const hasTreasuryAccess = permissions.some((p) => p.startsWith("treasury:"));

  const actions: Array<{
    href: string;
    icon: LucideIcon;
    label: string;
    tone: QuickActionTone;
    visible: boolean;
  }> = [
    {
      href: "/cash-flow",
      icon: Wallet,
      label: "Abrir Caixa",
      tone: "green",
      visible: permissions.includes(PERMISSIONS.CASH_REGISTER_OPEN),
    },
    {
      href: "/accounts-payable",
      icon: FilePlus,
      label: "Nova Conta",
      tone: "blue",
      visible: permissions.includes(PERMISSIONS.PAYABLE_CREATE),
    },
    {
      href: "/treasury",
      icon: Landmark,
      label: "Tesouraria",
      tone: "purple",
      visible: hasTreasuryAccess,
    },
    {
      href: "/accounts-payable",
      icon: Receipt,
      label: "Contas a Pagar",
      tone: "red",
      visible: permissions.includes(PERMISSIONS.PAYABLE_READ),
    },
  ];

  const visibleActions = actions.filter((action) => action.visible);
  if (visibleActions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {visibleActions.map((action) => (
        <QuickActionButton key={action.label} {...action} />
      ))}
    </div>
  );
}
