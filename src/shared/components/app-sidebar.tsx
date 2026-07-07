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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
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
}

const FINANCEIRO: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts-payable", label: "Contas a Pagar", icon: Receipt },
  { href: "/cash-flow", label: "Caixa Recepção", icon: ArrowLeftRight },
  { href: "/treasury", label: "Tesouraria", icon: Landmark },
];

const CADASTROS: NavItem[] = [
  { href: "/suppliers", label: "Beneficiários", icon: Building2 },
  { href: "/categories", label: "Categorias", icon: Tags },
];

const SOLTOS: NavItem[] = [
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

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
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      <div className="space-y-1">
        {!collapsed && (
          <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
            Financeiro
          </p>
        )}
        {FINANCEIRO.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>

      <div className="space-y-1">
        {!collapsed && (
          <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
            Cadastros
          </p>
        )}
        {CADASTROS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
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
            collapsed={collapsed}
          />
        ))}
      </div>
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
}: {
  userName: string;
  roleName: string;
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
      <SidebarNav collapsed={collapsed} />
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
}: {
  userName: string;
  roleName: string;
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
          <SidebarNav onNavigate={() => setOpen(false)} />
          <SidebarFooter userName={userName} roleName={roleName} />
        </SheetContent>
      </Sheet>
    </>
  );
}
