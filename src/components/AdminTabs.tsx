import { Link, useRouterState } from "@tanstack/react-router";

const tabs = [
  { to: "/admin/productos", label: "Productos" },
  { to: "/admin/categorias", label: "Categorías" },
  { to: "/admin/extras", label: "Extras" },
  { to: "/admin/mesas", label: "Mesas" },
] as const;

export function AdminTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="border-b border-border bg-surface/40 px-8 pt-5">
      <h1 className="text-3xl font-bold">Administración</h1>
      <p className="text-sm text-muted-foreground">Gestiona el catálogo del restaurante</p>
      <div className="mt-4 flex gap-1">
        {tabs.map((t) => {
          const active = path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`rounded-t-xl px-5 py-3 text-sm font-semibold ${
                active ? "bg-background text-primary" : "text-muted-foreground hover:bg-surface"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
