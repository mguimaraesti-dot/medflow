"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { LogoutButton } from "@/features/auth/presentation/logout-button";
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
];

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

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      <div className="space-y-1">
        <p className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
          Financeiro
        </p>
        {FINANCEIRO.map((item) => (
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

function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 px-4 py-4 font-semibold"
    >
      <span className="bg-primary flex h-7 w-7 items-center justify-center rounded-md text-sm text-white">
        M
      </span>
      MedFlow
    </Link>
  );
}

/** Sidebar fixa (desktop, lg+) — sempre visível, sem estado de colapsar. */
export function AppSidebar({
  userName,
  roleName,
}: {
  userName: string;
  roleName: string;
}) {
  return (
    <aside className="bg-background hidden w-64 shrink-0 flex-col border-r lg:flex">
      <Logo />
      <SidebarNav />
      <SidebarFooter userName={userName} roleName={roleName} />
    </aside>
  );
}

/** Topbar + Sheet (mobile, abaixo de lg) — mesmo conteúdo de navegação. */
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
        <Link href="/dashboard" className="font-semibold">
          MedFlow
        </Link>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <Logo />
          <SidebarNav onNavigate={() => setOpen(false)} />
          <SidebarFooter userName={userName} roleName={roleName} />
        </SheetContent>
      </Sheet>
    </>
  );
}
