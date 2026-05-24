import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money, type ProductRow, type CategoryRow, type OrderRow } from "@/lib/pos";
import { Plus, Minus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/caja-rapida")({ component: QuickCash });

type Line = { product: ProductRow; qty: number };

function QuickCash() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState("efectivo");
  const [activeCat, setActiveCat] = useState<string | "all">("all");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data } = await supabase.from("products").select("*").eq("available", true).order("sort_order");
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => products.filter((p) => activeCat === "all" || p.category_id === activeCat),
    [products, activeCat],
  );

  const add = (p: ProductRow) => {
    setLines((l) => {
      const i = l.findIndex((x) => x.product.id === p.id);
      if (i >= 0) {
        const next = [...l];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...l, { product: p, qty: 1 }];
    });
  };
  const setQty = (id: string, q: number) =>
    setLines((l) => (q <= 0 ? l.filter((x) => x.product.id !== id) : l.map((x) => (x.product.id === id ? { ...x, qty: q } : x))));

  const total = lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0);

  const charge = useMutation({
    mutationFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          type: "quick",
          status: "paid",
          payment_method: method,
          amount_received: total,
          closed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      if (lines.length) {
        const { error: ie } = await supabase.from("order_items").insert(
          lines.map((l) => ({
            order_id: order.id,
            product_id: l.product.id,
            name_snapshot: l.product.name,
            price_snapshot: l.product.price,
            quantity: l.qty,
          })),
        );
        if (ie) throw ie;
      }
      return order;
    },
    onSuccess: () => {
      toast.success("Cobro registrado");
      setLines([]);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex h-full">
        <section className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-surface/40 px-8 py-5">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold">
                <Zap className="h-7 w-7 text-primary" /> Caja rápida
              </h1>
              <p className="text-sm text-muted-foreground">Cobro inmediato sin mesa</p>
            </div>
          </header>
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-surface/20 px-5 py-3 no-scrollbar">
            <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")}>Todo</Chip>
            {categories.map((c) => (
              <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                <span className="mr-1">{c.icon}</span> {c.name}
              </Chip>
            ))}
          </div>
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="tap-hi flex aspect-square flex-col items-center justify-between rounded-2xl bg-surface p-4 text-center hover:bg-surface-2 hover:ring-2 hover:ring-primary"
              >
                <div className="text-5xl">{p.emoji ?? "🍽️"}</div>
                <div>
                  <div className="line-clamp-2 text-sm font-semibold">{p.name}</div>
                  <div className="font-bold text-primary">{money(p.price)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="flex w-[400px] flex-col border-l border-border bg-surface/30">
          <div className="border-b border-border px-5 py-4 text-lg font-bold">Ticket</div>
          <div className="flex-1 overflow-y-auto p-3">
            {lines.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Toca productos para agregar
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li key={l.product.id} className="flex items-center gap-2 rounded-xl bg-surface p-3">
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={() => setQty(l.product.id, l.qty + 1)} className="tap-hi flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 hover:bg-primary/20">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                      <button onClick={() => setQty(l.product.id, l.qty - 1)} className="tap-hi flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 hover:bg-destructive/20">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{l.product.name}</div>
                      <div className="text-xs text-muted-foreground">{money(l.product.price)} c/u</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular-nums">{money(Number(l.product.price) * l.qty)}</div>
                      <button onClick={() => setQty(l.product.id, 0)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="text-3xl font-black tabular-nums text-primary">{money(total)}</span>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {["efectivo", "tarjeta", "transferencia"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`tap-hi rounded-lg py-3 text-xs font-semibold capitalize ${
                    method === m ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-surface-2"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => charge.mutate()}
              disabled={lines.length === 0 || charge.isPending}
              className="tap-hi w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-40"
            >
              Cobrar {money(total)}
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`tap-hi whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${
        active ? "bg-primary text-primary-foreground" : "bg-surface text-foreground hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
