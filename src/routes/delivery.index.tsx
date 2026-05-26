import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money, elapsed, type OrderRow } from "@/lib/pos";
import { Plus, Bike } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/delivery/")({ component: DeliveryList });

const PROVIDERS = ["Hugo", "PedidosYa", "Uber Eats", "Otro"];

function DeliveryList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<string>("Hugo");
  const [reference, setReference] = useState("");

  const { data: orders = [] } = useQuery({
    queryKey: ["delivery-orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data } = await supabase
        .from("orders").select("*").eq("type", "delivery")
        .in("status", ["open", "awaiting_payment"])
        .order("queue_number", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("pos-delivery")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        qc.invalidateQueries({ queryKey: ["delivery-orders"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const create = useMutation({
    mutationFn: async () => {
      // Next queue number for today
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data: existing } = await supabase
        .from("orders").select("queue_number")
        .eq("type", "delivery").gte("opened_at", start.toISOString())
        .order("queue_number", { ascending: false }).limit(1);
      const next = (existing?.[0]?.queue_number ?? 0) + 1;
      const { data, error } = await supabase.from("orders").insert({
        type: "delivery", status: "open",
        customer_name: reference || `${provider} #${next}`,
        delivery_provider: provider,
        queue_number: next,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (order) => {
      setReference("");
      qc.invalidateQueries({ queryKey: ["delivery-orders"] });
      navigate({ to: "/delivery/$orderId", params: { orderId: order.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface/40 px-8 py-5">
          <h1 className="text-3xl font-bold">Delivery · Fila en caja</h1>
          <p className="text-sm text-muted-foreground">El repartidor pide en caja, paga y se le entrega ficha con número de fila</p>
        </header>

        <div className="border-b border-border bg-surface/20 px-8 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button key={p} onClick={() => setProvider(p)}
                className={`tap-hi rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  provider === p ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-surface-2"
                }`}>{p}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="Referencia / nombre del repartidor (opcional)"
              className="flex-1 rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && create.mutate()} />
            <button onClick={() => create.mutate()}
              className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">
              <Plus className="h-5 w-5" /> Tomar fila
            </button>
          </div>
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4">
          {orders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <Bike className="h-12 w-12 opacity-40" />
              Sin deliveries en fila
            </div>
          )}
          {orders.map((o) => (
            <Link key={o.id} to="/delivery/$orderId" params={{ orderId: o.id }}
              className="tap-hi flex flex-col rounded-3xl bg-surface p-5 ring-2 ring-inset ring-info/30 hover:bg-surface-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-info/20 px-3 py-1 text-[10px] font-semibold uppercase text-info">
                  {o.delivery_provider ?? "Delivery"}
                </span>
                <span className="text-xs text-muted-foreground">{elapsed(o.opened_at)}</span>
              </div>
              <div className="text-5xl font-black tabular-nums text-primary">#{o.queue_number ?? "—"}</div>
              <div className="mt-1 truncate text-sm text-muted-foreground">{o.customer_name}</div>
              <div className="mt-auto pt-3 text-2xl font-black tabular-nums">{money(o.total)}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
