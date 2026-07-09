"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  Landmark,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Tags,
  Users as UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  PERMISSIONS,
  hasBroaderThanCashRegisterAccess,
} from "@/core/permissions/roles-permissions";
import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { LogoutButton } from "@/features/auth/presentation/logout-button";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Cada item só aparece pra quem tem a permissão correspondente — a Secretária (só Caixa Recepção) não pode ver os demais módulos. */
  isVisible: (permissions: string[]) => boolean;
}

const hasTreasuryAccess = (permissions: string[]) =>
  permissions.some((permission) => permission.startsWith("treasury:"));

const FINANCEIRO: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    isVisible: (p) => p.includes(PERMISSIONS.DASHBOARD_READ),
  },
  {
    href: "/cash-flow",
    label: "Caixa Recepção",
    icon: ArrowLeftRight,
    isVisible: (p) => p.includes(PERMISSIONS.CASH_FLOW_READ),
  },
  {
    href: "/accounts-payable",
    label: "Contas a Pagar",
    icon: Receipt,
    isVisible: (p) => p.includes(PERMISSIONS.PAYABLE_READ),
  },
  {
    href: "/treasury",
    label: "Tesouraria",
    icon: Landmark,
    isVisible: hasTreasuryAccess,
  },
];

const CADASTROS: NavItem[] = [
  {
    href: "/suppliers",
    label: "Beneficiários",
    icon: Building2,
    isVisible: (p) => p.includes(PERMISSIONS.PAYABLE_READ),
  },
  {
    href: "/categories",
    label: "Categorias",
    icon: Tags,
    // cashflow:read sozinho não basta — é a mesma permissão que a
    // Secretária tem pro Caixa Recepção.
    isVisible: hasBroaderThanCashRegisterAccess,
  },
];

const SOLTOS: NavItem[] = [
  {
    href: "/reports",
    label: "Relatórios",
    icon: BarChart3,
    isVisible: hasBroaderThanCashRegisterAccess,
  },
  {
    href: "/settings",
    label: "Configurações",
    icon: Settings,
    isVisible: hasBroaderThanCashRegisterAccess,
  },
];

/** Só some da sidebar — a proteção real continua nas API Routes (`requirePermission`). */
const USERS_NAV_ITEM: NavItem = {
  href: "/users",
  label: "Usuários",
  icon: UsersIcon,
  isVisible: (p) => p.includes(PERMISSIONS.USERS_MANAGE),
};

/** Preferência local — o app não tem outro mecanismo de persistência client-only hoje (tema usa o mesmo padrão via next-themes). */
const SIDEBAR_COLLAPSED_STORAGE_KEY = "medflow:sidebar-collapsed";

function NavLink({
  item,
  pathname,
  onNavigate,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  const active = pathname === item.href;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && item.label}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarNav({
  onNavigate,
  collapsed,
  permissions,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  permissions: string[];
}) {
  const pathname = usePathname();

  const financeiro = FINANCEIRO.filter((item) => item.isVisible(permissions));
  const cadastros = CADASTROS.filter((item) => item.isVisible(permissions));
  const soltos = SOLTOS.filter((item) => item.isVisible(permissions));
  const showUsers = USERS_NAV_ITEM.isVisible(permissions);

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      {financeiro.length > 0 && (
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
              Financeiro
            </p>
          )}
          {financeiro.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}

      {cadastros.length > 0 && (
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
              Cadastros
            </p>
          )}
          {cadastros.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}

      {(soltos.length > 0 || showUsers) && (
        <div className="space-y-1">
          {soltos.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
          {showUsers && (
            <NavLink
              item={USERS_NAV_ITEM}
              pathname={pathname}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          )}
        </div>
      )}
    </nav>
  );
}

function SidebarFooter({
  userName,
  roleName,
  collapsed,
}: {
  userName: string;
  roleName: string;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {userName} · {roleName}
          </TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <LogoutButton iconOnly />
      </div>
    );
  }

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

function SidebarLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn("px-4 py-4", collapsed && "flex justify-center px-0")}
    >
      <Logo showText={!collapsed} />
    </Link>
  );
}

/**
 * Sidebar fixa (desktop, lg+) — recolhível (Refinamento de Navegação).
 * Preferência persiste em localStorage; segue o mesmo padrão de
 * "mounted guard" do ThemeToggle pra evitar mismatch de hidratação (o
 * valor salvo só existe no client).
 */
export function AppSidebar({
  userName,
  roleName,
  permissions,
}: {
  userName: string;
  roleName: string;
  permissions: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "bg-background relative hidden shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <SidebarLogo collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} permissions={permissions} />
      <SidebarFooter
        userName={userName}
        roleName={roleName}
        collapsed={collapsed}
      />

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className="bg-background text-muted-foreground hover:text-foreground hover:bg-muted absolute top-20 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
}

/** Topbar + Sheet (mobile, abaixo de lg) — Drawer, sem estado de colapsar (não faz sentido recolher algo que já é sob demanda). */
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
            onNavigate={() => setOpen(false)}
            permissions={permissions}
          />
          <SidebarFooter userName={userName} roleName={roleName} />
        </SheetContent>
      </Sheet>
    </>
  );
}
