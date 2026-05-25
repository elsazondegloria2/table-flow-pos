import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money, ORDER_TYPE_LABEL } from "@/lib/pos";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/reportes")({ component: Reports });

type Period = "day" | "week" | "month";

function startOf(p: Period): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "week") d.setDate(d.getDate() - d.getDay());
  if (p === "month") d.setDate(1);
  return d;
}

const COLORS = ["#e85d3a", "#f0a929", "#5cbdb9", "#a78bfa", "#22c55e", "#ef4444"];

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
        .select("name_snapshot, quantity, price_snapshot, orders!inner(status, closed_at)")
        .eq("orders.status", "paid")
        .gte("orders.closed_at", since);

      const tally: Record<string, { qty: number; revenue: number }> = {};
      (items ?? []).forEach((i) => {
        tally[i.name_snapshot] = tally[i.name_snapshot] ?? { qty: 0, revenue: 0 };
        tally[i.name_snapshot].qty += i.quantity;
        tally[i.name_snapshot].revenue += i.quantity * Number(i.price_snapshot);
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

  const typeData = Object.entries(data?.byType ?? {}).map(([t, v]) => ({
    name: ORDER_TYPE_LABEL[t] ?? t,
    value: v.total,
    count: v.count,
  }));

  const topChart = (data?.top ?? []).slice(0, 8).map(([name, v]) => ({ name, cantidad: v.qty, ingreso: v.revenue }));
  const hourChart = Object.entries(data?.byHour ?? {})
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([h, v]) => ({ hora: `${h}h`, ventas: Math.round(v) }));

  const bestSeller = data?.top[0];

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border bg-surface/40 px-8 py-5">
          <div>
            <h1 className="text-3xl font-bold">Reportes</h1>
            <p className="text-sm text-muted-foreground">Análisis ejecutivo de ventas</p>
          </div>
          <div className="flex gap-2">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`tap-hi rounded-xl px-5 py-2.5 text-sm font-semibold ${period === p ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-surface-2"}`}>
                {p === "day" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
          <KPI label="Total" value={money(data?.total)} sub={`${data?.orders.length ?? 0} órdenes`} accent />
          {(["dine_in", "takeaway", "delivery"] as const).map((t) => {
            const v = data?.byType[t];
            return (
              <KPI key={t} label={ORDER_TYPE_LABEL[t]}
                value={money(v?.total ?? 0)} sub={`${v?.count ?? 0} órdenes`} />
            );
          })}
        </div>

        {bestSeller && (
          <div className="mx-6 mb-2 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-primary/20 to-warning/15 p-5 ring-2 ring-inset ring-primary/30">
            <div className="text-5xl">🏆</div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Platillo más vendido</div>
              <div className="text-2xl font-black">{bestSeller[0]}</div>
              <div className="text-sm text-muted-foreground">{bestSeller[1].qty} unidades · {money(bestSeller[1].revenue)}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
          <Panel title="Ventas por canal">
            {typeData.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                      label={(entry) => `${entry.name}`}>
                      {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "#2d2d2d", border: "1px solid #4a4a4a", borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty />}
          </Panel>

          <Panel title="Ventas por hora">
            {hourChart.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                    <XAxis dataKey="hora" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "#2d2d2d", border: "1px solid #4a4a4a", borderRadius: 8 }} />
                    <Bar dataKey="ventas" fill="#e85d3a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty />}
          </Panel>

          <Panel title="Top 8 platillos">
            {topChart.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topChart} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={110} />
                    <Tooltip contentStyle={{ background: "#2d2d2d", border: "1px solid #4a4a4a", borderRadius: 8 }} />
                    <Bar dataKey="cantidad" fill="#f0a929" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty />}
          </Panel>

          <Panel title="Detalle por canal">
            {typeData.length ? (
              <ul className="space-y-2">
                {typeData.map((t, i) => (
                  <li key={t.name} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                    <span className="h-4 w-4 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.count} órdenes</div>
                    </div>
                    <div className="text-lg font-bold tabular-nums">{money(t.value)}</div>
                  </li>
                ))}
              </ul>
            ) : <Empty />}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${accent ? "bg-primary/15 ring-2 ring-inset ring-primary/30" : "bg-surface"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-black tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
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
  return <div className="rounded-xl bg-surface p-10 text-center text-sm text-muted-foreground">Sin datos en este período</div>;
}
