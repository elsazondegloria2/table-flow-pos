import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money } from "@/lib/pos";

export const Route = createFileRoute("/reportes")({ component: Reports });

type Period = "day" | "week" | "month";

function startOf(p: Period): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "week") d.setDate(d.getDate() - d.getDay());
  if (p === "month") d.setDate(1);
  return d;
}

function Reports() {
  const [period, setPeriod] = useState<Period>("day");
  const since = startOf(period).toISOString();

  const { data } = useQuery({
    queryKey: ["reports", period],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, type, total, closed_at, opened_at, payment_method")
        .eq("status", "paid")
        .gte("closed_at", since)
        .order("closed_at", { ascending: false });

      const { data: items } = await supabase
        .from("order_items")
        .select("name_snapshot, quantity, orders!inner(status, closed_at)")
        .eq("orders.status", "paid")
        .gte("orders.closed_at", since);

      const tally: Record<string, { qty: number }> = {};
      (items ?? []).forEach((i) => {
        tally[i.name_snapshot] = tally[i.name_snapshot] ?? { qty: 0 };
        tally[i.name_snapshot].qty += i.quantity;
      });
      const top = Object.entries(tally).sort((a, b) => b[1].qty - a[1].qty);

      const byType: Record<string, { count: number; total: number }> = {};
      (orders ?? []).forEach((o) => {
        byType[o.type] = byType[o.type] ?? { count: 0, total: 0 };
        byType[o.type].count++;
        byType[o.type].total += Number(o.total);
      });

      const byHour: Record<number, number> = {};
      (orders ?? []).forEach((o) => {
        const h = new Date(o.closed_at!).getHours();
        byHour[h] = (byHour[h] ?? 0) + Number(o.total);
      });

      return {
        orders: orders ?? [],
        total: (orders ?? []).reduce((s, o) => s + Number(o.total), 0),
        top,
        byType,
        byHour,
      };
    },
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border bg-surface/40 px-8 py-5">
          <div>
            <h1 className="text-3xl font-bold">Reportes</h1>
            <p className="text-sm text-muted-foreground">Análisis de ventas</p>
          </div>
          <div className="flex gap-2">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`tap-hi rounded-xl px-5 py-2.5 text-sm font-semibold ${
                  period === p ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-surface-2"
                }`}
              >
                {p === "day" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-primary/15 p-5 ring-2 ring-inset ring-primary/30">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="mt-2 text-4xl font-black tabular-nums text-primary">{money(data?.total)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{data?.orders.length ?? 0} órdenes</div>
          </div>
          {Object.entries(data?.byType ?? {}).map(([t, v]) => (
            <div key={t} className="rounded-3xl bg-surface p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {t === "dine_in" ? "Local" : t === "takeaway" ? "Para llevar" : "Caja rápida"}
              </div>
              <div className="mt-2 text-3xl font-black tabular-nums">{money(v.total)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{v.count} órdenes</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-surface/40 p-5">
            <h2 className="mb-3 text-lg font-bold">Productos vendidos</h2>
            {data?.top.length ? (
              <ul className="space-y-2">
                {data.top.map(([name, v], i) => (
                  <li key={name} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 font-semibold">{name}</div>
                    <div className="text-lg font-bold tabular-nums">{v.qty}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl bg-surface p-6 text-center text-sm text-muted-foreground">Sin datos</div>
            )}
          </div>

          <div className="rounded-3xl bg-surface/40 p-5">
            <h2 className="mb-3 text-lg font-bold">Horas pico</h2>
            {Object.keys(data?.byHour ?? {}).length ? (
              <div className="space-y-1.5">
                {Object.entries(data?.byHour ?? {})
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([h, v]) => {
                    const max = Math.max(...Object.values(data?.byHour ?? { 0: 1 }));
                    const pct = (v / max) * 100;
                    return (
                      <div key={h} className="flex items-center gap-3">
                        <div className="w-12 text-xs text-muted-foreground tabular-nums">{h}:00</div>
                        <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-surface">
                          <div className="absolute inset-y-0 left-0 bg-primary/60" style={{ width: `${pct}%` }} />
                          <div className="absolute inset-0 flex items-center justify-end px-2 text-xs font-semibold">
                            {money(v)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="rounded-xl bg-surface p-6 text-center text-sm text-muted-foreground">Sin datos</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
