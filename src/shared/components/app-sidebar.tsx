"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  Landmark,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  Tags,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { LogoutButton } from "@/features/auth/presentation/logout-button";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const FINANCEIRO: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts-payable", label: "Contas a Pagar", icon: Receipt },
  { href: "/cash-flow", label: "Fluxo de Caixa", icon: ArrowLeftRight },
  { href: "/treasury", label: "Tesouraria", icon: Landmark },
];

/** Só aparece pra quem tem payable:delete (Administrador) — anexado condicionalmente ao final do bloco Financeiro. */
const DELETED_PAYABLES_ITEM: NavItem = {
  href: "/accounts-payable/deleted",
  label: "Contas Excluídas",
  icon: Trash2,
};

const CADASTROS: NavItem[] = [
  { href: "/suppliers", label: "Fornecedores", icon: Building2 },
  { href: "/categories", label: "Categorias", icon: Tags },
];

const SOLTOS: NavItem[] = [
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarNav({
  permissions,
  onNavigate,
}: {
  permissions: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const financeiroItems = permissions.includes(PERMISSIONS.PAYABLE_DELETE)
    ? [...FINANCEIRO, DELETED_PAYABLES_ITEM]
    : FINANCEIRO;

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      <div className="space-y-1">
        <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
          Financeiro
        </p>
        {financeiroItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
          Cadastros
        </p>
        {CADASTROS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="space-y-1">
        {SOLTOS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function SidebarFooter({
  userName,
  roleName,
}: {
  userName: string;
  roleName: string;
}) {
  return (
    <div className="space-y-3 border-t p-3">
      <div className="flex items-center gap-2 px-1">
        <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="text-muted-foreground truncate text-xs">{roleName}</p>
        </div>
        <ThemeToggle />
      </div>
      <LogoutButton className="w-full" />
    </div>
  );
}

function SidebarLogo() {
  return (
    <Link href="/dashboard" className="px-4 py-4">
      <Logo />
    </Link>
  );
}

/** Sidebar fixa (desktop, lg+) — sempre visível, sem estado de colapsar. */
export function AppSidebar({
  userName,
  roleName,
  permissions,
}: {
  userName: string;
  roleName: string;
  permissions: string[];
}) {
  return (
    <aside className="bg-background hidden w-64 shrink-0 flex-col border-r lg:flex">
      <SidebarLogo />
      <SidebarNav permissions={permissions} />
      <SidebarFooter userName={userName} roleName={roleName} />
    </aside>
  );
}

/** Topbar + Sheet (mobile, abaixo de lg) — mesmo conteúdo de navegação. */
export function MobileSidebarTrigger({
  userName,
  roleName,
  permissions,
}: {
  userName: string;
  roleName: string;
  permissions: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center gap-2 border-b p-4 lg:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard">
          <Logo />
        </Link>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarLogo />
          <SidebarNav
            permissions={permissions}
            onNavigate={() => setOpen(false)}
          />
          <SidebarFooter userName={userName} roleName={roleName} />
        </SheetContent>
      </Sheet>
    </>
  );
}
