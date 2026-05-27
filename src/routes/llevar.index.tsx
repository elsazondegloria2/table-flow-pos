import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money, elapsed, type OrderRow } from "@/lib/pos";
import { Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/llevar/")({ component: TakeawayList });

function TakeawayList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const { data: orders = [] } = useQuery({
    queryKey: ["takeaway-orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("type", "takeaway")
        .in("status", ["open", "awaiting_payment"])
        .order("opened_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .insert({ type: "takeaway", status: "open", customer_name: name || `Orden ${Date.now() % 1000}` })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (order) => {
      setName("");
      qc.invalidateQueries({ queryKey: ["takeaway-orders"] });
      navigate({ to: "/llevar/$orderId", params: { orderId: order.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface/40 px-8 py-5">
          <h1 className="text-3xl font-bold">Mostrador · Para llevar</h1>
          <p className="text-sm text-muted-foreground">Cobro rápido y órdenes para llevar. El cliente pide, paga y se le entrega su factura.</p>
        </header>

        <div className="border-b border-border bg-surface/20 px-8 py-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente (opcional)"
              className="flex-1 rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && create.mutate()}
            />
            <button
              onClick={() => create.mutate()}
              className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              <Plus className="h-5 w-5" /> Nueva orden
            </button>
          </div>
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4">
          {orders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 opacity-40" />
              No hay órdenes para llevar abiertas
            </div>
          )}
          {orders.map((o) => (
            <Link
              key={o.id}
              to="/llevar/$orderId"
              params={{ orderId: o.id }}
              className="tap-hi flex flex-col rounded-3xl bg-surface p-5 ring-2 ring-inset ring-warning/30 hover:bg-surface-2"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-warning/20 px-3 py-1 text-[10px] font-semibold uppercase text-warning">
                  {o.status === "awaiting_payment" ? "Esperando cuenta" : "Abierta"}
                </span>
                <span className="text-xs text-muted-foreground">{elapsed(o.opened_at)}</span>
              </div>
              <div className="text-xl font-bold">{o.customer_name}</div>
              <div className="mt-auto pt-4 text-3xl font-black tabular-nums text-primary">{money(o.total)}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
