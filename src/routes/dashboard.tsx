import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money } from "@/lib/pos";
import { TrendingUp, DollarSign, ShoppingBag, Receipt } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function startOf(period: "day" | "week" | "month"): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - d.getDay());
  if (period === "month") d.setDate(1);
  return d.toISOString();
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [day, week, month, openTables, expenses, paidToday] = await Promise.all([
        supabase.from("orders").select("total").eq("status", "paid").gte("closed_at", startOf("day")),
        supabase.from("orders").select("total").eq("status", "paid").gte("closed_at", startOf("week")),
        supabase.from("orders").select("total").eq("status", "paid").gte("closed_at", startOf("month")),
        supabase.from("tables").select("id").neq("status", "free"),
        supabase.from("expenses").select("amount").gte("date", startOf("month").slice(0, 10)),
        supabase.from("orders").select("id, payment_method, total").eq("status", "paid").gte("closed_at", startOf("day")),
      ]);
      const sum = (rows?: { total: number }[] | null) =>
        (rows ?? []).reduce((s, r) => s + Number(r.total), 0);

      const byMethod: Record<string, number> = {};
      (paidToday.data ?? []).forEach((o) => {
        byMethod[o.payment_method ?? "—"] = (byMethod[o.payment_method ?? "—"] ?? 0) + Number(o.total);
      });

      // Top products this month
      const { data: items } = await supabase
        .from("order_items")
        .select("name_snapshot, quantity, orders!inner(status, closed_at)")
        .eq("orders.status", "paid")
        .gte("orders.closed_at", startOf("month"));
      const tally: Record<string, number> = {};
      (items ?? []).forEach((i) => {
        tally[i.name_snapshot] = (tally[i.name_snapshot] ?? 0) + i.quantity;
      });
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6);

      const expensesMonth = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

      return {
        day: sum(day.data),
        week: sum(week.data),
        month: sum(month.data),
        activeTables: (openTables.data ?? []).length,
        profit: sum(month.data) - expensesMonth,
        byMethod,
        top,
      };
    },
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-y-auto">
        <header className="border-b border-border bg-surface/40 px-8 py-5">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen del restaurante</p>
        </header>

        <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
          <KPI icon={<DollarSign />} label="Ventas hoy" value={money(data?.day)} loading={isLoading} accent />
          <KPI icon={<TrendingUp />} label="Ventas semana" value={money(data?.week)} loading={isLoading} />
          <KPI icon={<Receipt />} label="Ventas mes" value={money(data?.month)} loading={isLoading} />
          <KPI icon={<ShoppingBag />} label="Mesas activas" value={String(data?.activeTables ?? 0)} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
          <Panel title="Top productos del mes">
            {data?.top.length ? (
              <ul className="space-y-2">
                {data.top.map(([name, qty], i) => (
                  <li key={name} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 font-semibold">{name}</div>
                    <div className="text-lg font-bold tabular-nums">{qty}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Panel>

          <Panel title="Métodos de pago (hoy)">
            {Object.keys(data?.byMethod ?? {}).length ? (
              <ul className="space-y-2">
                {Object.entries(data?.byMethod ?? {}).map(([m, v]) => (
                  <li key={m} className="flex items-center justify-between rounded-xl bg-surface p-3">
                    <span className="font-semibold capitalize">{m}</span>
                    <span className="text-lg font-bold tabular-nums">{money(v)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/15 p-3">
              <span className="text-sm font-semibold uppercase tracking-wider">Ganancia mes (estim.)</span>
              <span className="text-xl font-black tabular-nums text-primary">{money(data?.profit)}</span>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function KPI({ icon, label, value, accent, loading }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; loading?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${accent ? "bg-primary/15 ring-2 ring-inset ring-primary/30" : "bg-surface"}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className={`mt-2 text-3xl font-black tabular-nums ${accent ? "text-primary" : ""}`}>
        {loading ? "…" : value}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface/40 p-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="rounded-xl bg-surface p-6 text-center text-sm text-muted-foreground">Sin datos todavía</div>;
}
