import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money, elapsed, TABLE_STATUS_META, type TableRow, type OrderRow } from "@/lib/pos";
import { Users, ShoppingBag, Zap, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: TablesPage });

type TableWithOrder = TableRow & { open_order?: OrderRow | null };

function TablesPage() {
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);
  void tick;

  const { data, isLoading } = useQuery({
    queryKey: ["tables-with-orders"],
    queryFn: async (): Promise<TableWithOrder[]> => {
      const [{ data: tables }, { data: orders }] = await Promise.all([
        supabase.from("tables").select("*").order("number"),
        supabase.from("orders").select("*").in("status", ["open", "awaiting_payment"]).eq("type", "dine_in"),
      ]);
      return (tables ?? []).map((t) => ({
        ...t,
        open_order: orders?.find((o) => o.table_id === t.id) ?? null,
      }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("pos-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () =>
        qc.invalidateQueries({ queryKey: ["tables-with-orders"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        qc.invalidateQueries({ queryKey: ["tables-with-orders"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const navigate = useNavigate();
  const openTable = useMutation({
    mutationFn: async (t: TableWithOrder) => {
      if (t.open_order) return t.open_order;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ table_id: t.id, type: "dine_in", status: "open", guests: t.guests || 2 })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("tables")
        .update({ status: "occupied", opened_at: new Date().toISOString(), guests: t.guests || 2 })
        .eq("id", t.id);
      return order;
    },
    onSuccess: (order, t) => {
      qc.invalidateQueries({ queryKey: ["tables-with-orders"] });
      navigate({ to: "/mesa/$orderId", params: { orderId: order.id } });
      void t;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface/40 px-8 py-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mesas</h1>
            <p className="text-sm text-muted-foreground">Toca una mesa para abrir cuenta</p>
          </div>
          <div className="flex gap-3">
            <Legend />
            <Link
              to="/llevar"
              className="tap-hi flex items-center gap-2 rounded-xl bg-surface px-5 py-3 text-sm font-semibold hover:bg-surface-2"
            >
              <ShoppingBag className="h-5 w-5" /> Para llevar
            </Link>
            <Link
              to="/caja-rapida"
              className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Zap className="h-5 w-5" /> Caja rápida
            </Link>
          </div>
        </header>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-3xl bg-surface" />
              ))
            : (data ?? []).map((t) => {
                const status = t.open_order?.status === "awaiting_payment"
                  ? "awaiting_payment"
                  : t.open_order
                  ? "occupied"
                  : t.status;
                const meta = TABLE_STATUS_META[status] ?? TABLE_STATUS_META.free;
                return (
                  <button
                    key={t.id}
                    onClick={() => openTable.mutate(t)}
                    disabled={openTable.isPending}
                    className={`tap-hi group relative flex aspect-square flex-col items-start justify-between rounded-3xl p-5 text-left ring-2 ring-inset transition-colors ${meta.bg} ${meta.ring}`}
                  >
                    <div className="flex w-full items-start justify-between">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mesa</div>
                      <span className={`flex items-center gap-1.5 rounded-full bg-background/40 px-2.5 py-1 text-[10px] font-semibold uppercase`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-6xl font-black tabular-nums">{t.number}</div>
                    <div className="flex w-full items-end justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {t.capacity}
                      </span>
                      {t.open_order ? (
                        <div className="text-right">
                          <div className="font-semibold text-foreground">{money(t.open_order.total)}</div>
                          <div className="text-[10px]">{elapsed(t.open_order.opened_at)}</div>
                        </div>
                      ) : (
                        <span className="text-[10px]">Libre</span>
                      )}
                    </div>
                  </button>
                );
              })}
        </div>
      </div>
    </AppShell>
  );
}

function Legend() {
  return (
    <div className="hidden items-center gap-3 rounded-xl bg-surface px-4 py-2 text-xs text-muted-foreground md:flex">
      {(["free", "occupied", "awaiting_payment", "reserved"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${TABLE_STATUS_META[s].dot}`} />
          {TABLE_STATUS_META[s].label}
        </span>
      ))}
    </div>
  );
}
