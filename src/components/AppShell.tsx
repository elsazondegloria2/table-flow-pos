import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  ShoppingBag,
  Bike,
  Zap,
  BarChart3,
  FileText,
  Wallet,
  Settings,
  Flame,
} from "lucide-react";

const nav = [
  { to: "/", label: "Mesas", icon: LayoutGrid },
  { to: "/llevar", label: "Llevar", icon: ShoppingBag },
  { to: "/delivery", label: "Delivery", icon: Bike },
  { to: "/caja-rapida", label: "Caja", icon: Zap },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/reportes", label: "Reportes", icon: FileText },
  { to: "/gastos", label: "Gastos", icon: Wallet },
  { to: "/admin/productos", label: "Admin", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="flex w-24 flex-col items-center gap-2 border-r border-border bg-sidebar py-4">
        <Link
          to="/"
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          aria-label="Inicio"
        >
          <Flame className="h-7 w-7" />
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-1.5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active =
              to === "/"
                ? path === "/"
                : path.startsWith(to.replace(/\/$/, ""));
            return (
              <Link
                key={to}
                to={to}
                className={`tap-hi flex w-20 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="text-[10px] text-muted-foreground">POS</div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
