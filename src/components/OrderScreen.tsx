import { useState, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  money,
  elapsed,
  ORDER_TYPE_LABEL,
  type OrderType,
  type ProductRow,
  type CategoryRow,
  type ExtraRow,
  type OrderRow,
  type OrderItemRow,
  type OrderItemExtraRow,
} from "@/lib/pos";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  X,
  Pencil,
  Sparkles,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

type ItemWithExtras = OrderItemRow & { order_item_extras: OrderItemExtraRow[] };

const backRouteFor = (mode: OrderType) =>
  mode === "dine_in" ? "/" : mode === "delivery" ? "/delivery" : "/llevar";

export function OrderScreen({ orderId, mode }: { orderId: string; mode: OrderType }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [editing, setEditing] = useState<ItemWithExtras | null>(null);
  const [paying, setPaying] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async (): Promise<OrderRow | null> => {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async (): Promise<ItemWithExtras[]> => {
      const { data } = await supabase
        .from("order_items")
        .select("*, order_item_extras(*)")
        .eq("order_id", orderId)
        .order("created_at");
      return (data as ItemWithExtras[]) ?? [];
    },
  });

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
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("available", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: extras = [] } = useQuery({
    queryKey: ["extras"],
    queryFn: async (): Promise<ExtraRow[]> => {
      const { data } = await supabase.from("extras").select("*").order("name");
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => products.filter((p) => activeCat === "all" || p.category_id === activeCat),
    [products, activeCat],
  );

  const back = () => navigate({ to: backRouteFor(mode) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order-items", orderId] });
    qc.invalidateQueries({ queryKey: ["order", orderId] });
    qc.invalidateQueries({ queryKey: ["tables-with-orders"] });
    qc.invalidateQueries({ queryKey: ["takeaway-orders"] });
    qc.invalidateQueries({ queryKey: ["delivery-orders"] });
  };

  const addProduct = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase.from("order_items").insert({
        order_id: orderId,
        product_id: p.id,
        name_snapshot: p.name,
        price_snapshot: p.price,
        quantity: 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQty = useMutation({
    mutationFn: async ({ id, q }: { id: string; q: number }) => {
      if (q <= 0) await supabase.from("order_items").delete().eq("id", id);
      else await supabase.from("order_items").update({ quantity: q }).eq("id", id);
    },
    onSuccess: invalidate,
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await supabase.from("order_items").update({ notes }).eq("id", id);
    },
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("order_items").delete().eq("id", id);
    },
    onSuccess: invalidate,
  });

  const addExtra = useMutation({
    mutationFn: async ({ itemId, extra }: { itemId: string; extra: ExtraRow }) => {
      await supabase.from("order_item_extras").insert({
        order_item_id: itemId,
        extra_id: extra.id,
        name_snapshot: extra.name,
        price_snapshot: extra.price,
        quantity: 1,
      });
    },
    onSuccess: invalidate,
  });

  const removeExtra = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("order_item_extras").delete().eq("id", id);
    },
    onSuccess: invalidate,
  });

  const askBill = useMutation({
    mutationFn: async () => {
      await supabase.from("orders").update({ status: "awaiting_payment" }).eq("id", orderId);
      if (order?.table_id) {
        await supabase.from("tables").update({ status: "awaiting_payment" }).eq("id", order.table_id);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Marcado como 'esperando cuenta'");
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async () => {
      await supabase.from("orders").update({ status: "cancelled", closed_at: new Date().toISOString() }).eq("id", orderId);
      if (order?.table_id) {
        await supabase.from("tables").update({ status: "free", opened_at: null, guests: 0 }).eq("id", order.table_id);
      }
    },
    onSuccess: () => {
      invalidate();
      back();
    },
  });

  if (!order) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Cargando…</div>;
  }

  if (order.status === "paid" || order.status === "cancelled") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="text-2xl font-semibold">Orden cerrada</div>
        <button onClick={back} className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Volver
        </button>
      </div>
    );
  }

  const total = items.reduce(
    (s, it) =>
      s +
      Number(it.price_snapshot) * it.quantity +
      it.order_item_extras.reduce((es, e) => es + Number(e.price_snapshot) * e.quantity, 0),
    0,
  );

  const headerTitle =
    mode === "dine_in" ? "Mesa abierta" : order.customer_name || ORDER_TYPE_LABEL[mode];

  return (
    <div className="flex h-full">
      <section className="flex w-[420px] flex-col border-r border-border bg-surface/30">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <button onClick={back} className="tap-hi flex h-11 w-11 items-center justify-center rounded-xl bg-surface hover:bg-surface-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{ORDER_TYPE_LABEL[mode]}</div>
            <div className="text-xl font-bold">{headerTitle}</div>
            <div className="text-[11px] text-muted-foreground">{elapsed(order.opened_at)}</div>
          </div>
          <button
            onClick={() => { if (confirm("¿Cancelar esta orden? Los items se perderán.")) cancelOrder.mutate(); }}
            className="tap-hi flex h-11 w-11 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10"
            title="Cancelar orden"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Toca productos para agregar
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => {
                const itemTotal =
                  Number(it.price_snapshot) * it.quantity +
                  it.order_item_extras.reduce((s, e) => s + Number(e.price_snapshot) * e.quantity, 0);
                return (
                  <li key={it.id} className="rounded-2xl bg-surface p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <button onClick={() => updateQty.mutate({ id: it.id, q: it.quantity + 1 })} className="tap-hi flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 hover:bg-primary/20">
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-bold tabular-nums">{it.quantity}</span>
                        <button onClick={() => updateQty.mutate({ id: it.id, q: it.quantity - 1 })} className="tap-hi flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 hover:bg-destructive/20">
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold">{it.name_snapshot}</div>
                          <div className="font-bold tabular-nums">{money(itemTotal)}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{money(it.price_snapshot)} c/u</div>
                        {it.order_item_extras.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {it.order_item_extras.map((e) => (
                              <li key={e.id} className="flex items-center justify-between text-xs">
                                <button onClick={() => removeExtra.mutate(e.id)} className="text-primary/80 hover:text-destructive">
                                  + {e.name_snapshot}
                                </button>
                                <span className="text-muted-foreground">{money(Number(e.price_snapshot) * e.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {it.notes && (
                          <div className="mt-1 rounded-md bg-warning/15 px-2 py-1 text-[11px] text-warning">📝 {it.notes}</div>
                        )}
                        <div className="mt-2 flex gap-1">
                          <button onClick={() => setEditing(it)} className="tap-hi flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] hover:bg-primary/20">
                            <Sparkles className="h-3 w-3" /> Extra
                          </button>
                          <button
                            onClick={() => {
                              const n = prompt("Observación:", it.notes ?? "");
                              if (n !== null) updateNotes.mutate({ id: it.id, notes: n });
                            }}
                            className="tap-hi flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] hover:bg-primary/20"
                          >
                            <Pencil className="h-3 w-3" /> Nota
                          </button>
                          <button onClick={() => removeItem.mutate(it.id)} className="tap-hi ml-auto flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-border p-4">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-sm uppercase tracking-wider text-muted-foreground">Total</span>
            <span className="text-4xl font-black tabular-nums text-primary">{money(total)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => askBill.mutate()}
              disabled={items.length === 0 || order.status === "awaiting_payment"}
              className="tap-hi flex flex-col items-center justify-center gap-1 rounded-xl bg-warning px-2 py-3 text-xs font-semibold text-warning-foreground disabled:opacity-40"
            >
              <Receipt className="h-5 w-5" /> Pedir cuenta
            </button>
            <button
              onClick={() => setPreviewing(true)}
              disabled={items.length === 0}
              className="tap-hi flex flex-col items-center justify-center gap-1 rounded-xl bg-surface px-2 py-3 text-xs font-semibold hover:bg-surface-2 disabled:opacity-40"
            >
              <Printer className="h-5 w-5" /> Ver factura
            </button>
            <button
              onClick={() => setPaying(true)}
              disabled={items.length === 0}
              className="tap-hi flex flex-col items-center justify-center gap-1 rounded-xl bg-primary px-2 py-3 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <CreditCard className="h-5 w-5" /> Cobrar
            </button>
          </div>
        </footer>
      </section>

      <section className="flex flex-1 flex-col">
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-surface/20 px-5 py-3 no-scrollbar">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>Todo</CatChip>
          {categories.map((c) => (
            <CatChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
              <span className="mr-1">{c.icon}</span> {c.name}
            </CatChip>
          ))}
        </div>
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addProduct.mutate(p)}
              className="tap-hi group flex aspect-square flex-col overflow-hidden rounded-2xl bg-surface text-center hover:bg-surface-2 hover:ring-2 hover:ring-primary"
            >
              <div className="flex flex-1 items-center justify-center overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-5xl">{p.emoji ?? "🍽️"}</div>
                )}
              </div>
              <div className="space-y-0.5 bg-card/80 p-2 backdrop-blur">
                <div className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</div>
                <div className="text-base font-bold text-primary">{money(p.price)}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {editing && (
        <ExtrasModal
          item={editing}
          extras={extras}
          onClose={() => setEditing(null)}
          onAdd={(extra) => addExtra.mutate({ itemId: editing.id, extra })}
        />
      )}

      {previewing && (
        <TicketPreview order={order} items={items} total={total} mode={mode} onClose={() => setPreviewing(false)} />
      )}

      {paying && (
        <PayModal
          order={order}
          items={items}
          total={total}
          mode={mode}
          onClose={() => setPaying(false)}
          onPay={async ({ method, received }) => {
            await supabase
              .from("orders")
              .update({
                status: "paid",
                payment_method: method,
                amount_received: received,
                closed_at: new Date().toISOString(),
              })
              .eq("id", orderId);
            if (order.table_id) {
              await supabase.from("tables").update({ status: "free", opened_at: null, guests: 0 }).eq("id", order.table_id);
            }
            invalidate();
            toast.success("Pago registrado");
            back();
          }}
        />
      )}
    </div>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function ExtrasModal({ item, extras, onClose, onAdd }: {
  item: ItemWithExtras; extras: ExtraRow[]; onClose: () => void; onAdd: (e: ExtraRow) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Extras para {item.name_snapshot}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {extras.map((e) => (
            <button key={e.id} onClick={() => onAdd(e)} className="tap-hi flex flex-col items-start rounded-xl bg-surface p-3 text-left hover:bg-primary/20">
              <span className="font-semibold">{e.name}</span>
              <span className="text-sm text-primary">{money(e.price)}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">Listo</button>
      </div>
    </div>
  );
}

function TicketPreview({
  order, items, total, mode, onClose,
}: {
  order: OrderRow; items: ItemWithExtras[]; total: number; mode: OrderType; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const print = () => {
    const html = ref.current?.innerHTML ?? "";
    const w = window.open("", "ticket", "width=380,height=600");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Ticket</title><style>
      body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#000;background:#fff;padding:12px;font-size:12px}
      .center{text-align:center}.row{display:flex;justify-content:space-between;gap:8px}
      hr{border:none;border-top:1px dashed #000;margin:8px 0}
      .total{font-size:18px;font-weight:900}
      table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}
      .right{text-align:right;white-space:nowrap}
    </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex w-full max-w-sm flex-col rounded-3xl bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Vista previa de factura</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>
        <div ref={ref} className="rounded-xl bg-white p-4 font-mono text-[12px] leading-tight text-black">
          <div className="center">
            <div className="text-base font-black uppercase">Mi Restaurante</div>
            <div>RUC J0000000000000</div>
            <div>Tel. 0000-0000</div>
          </div>
          <hr />
          <div className="row"><span>{ORDER_TYPE_LABEL[mode]}</span><span>{new Date().toLocaleString("es-NI")}</span></div>
          {order.customer_name && <div className="row"><span>Cliente</span><span>{order.customer_name}</span></div>}
          <div className="row"><span>Orden</span><span>#{order.id.slice(0, 8)}</span></div>
          <hr />
          <table>
            <tbody>
              {items.map((it) => {
                const sub =
                  Number(it.price_snapshot) * it.quantity +
                  it.order_item_extras.reduce((s, e) => s + Number(e.price_snapshot) * e.quantity, 0);
                return (
                  <tr key={it.id}>
                    <td>{it.quantity}× {it.name_snapshot}
                      {it.order_item_extras.map((e) => (
                        <div key={e.id} style={{ paddingLeft: 12 }}>+ {e.name_snapshot}</div>
                      ))}
                    </td>
                    <td className="right">{money(sub)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <hr />
          <div className="row total"><span>TOTAL</span><span>{money(total)}</span></div>
          <hr />
          <div className="center">¡Gracias por su visita!</div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl bg-surface py-3 font-semibold">Cerrar</button>
          <button onClick={print} className="tap-hi flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

function PayModal({
  order, items, total, mode, onClose, onPay,
}: {
  order: OrderRow; items: ItemWithExtras[]; total: number; mode: OrderType;
  onClose: () => void; onPay: (p: { method: string; received: number }) => void;
}) {
  const [step, setStep] = useState<"preview" | "pay">("preview");
  const [method, setMethod] = useState("efectivo");
  const [received, setReceived] = useState<string>(total.toFixed(2));
  const change = Math.max(0, Number(received || 0) - total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">{step === "preview" ? "Revisar factura" : "Cobrar"}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>

        {step === "preview" ? (
          <>
            <div className="mb-3 max-h-64 overflow-y-auto rounded-2xl bg-surface p-4 font-mono text-xs">
              <div className="mb-2 text-center font-bold">{ORDER_TYPE_LABEL[mode]} · #{order.id.slice(0, 8)}</div>
              {order.customer_name && <div className="mb-2 text-center text-muted-foreground">{order.customer_name}</div>}
              <ul className="space-y-1">
                {items.map((it) => {
                  const sub =
                    Number(it.price_snapshot) * it.quantity +
                    it.order_item_extras.reduce((s, e) => s + Number(e.price_snapshot) * e.quantity, 0);
                  return (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span>{it.quantity}× {it.name_snapshot}</span>
                      <span className="tabular-nums">{money(sub)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mb-5 rounded-2xl bg-primary/15 p-5 text-center ring-2 ring-inset ring-primary/30">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total a cobrar</div>
              <div className="text-5xl font-black tabular-nums text-primary">{money(total)}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl bg-surface py-4 font-semibold">Volver</button>
              <button onClick={() => setStep("pay")} className="tap-hi flex-1 rounded-xl bg-primary py-4 font-semibold text-primary-foreground">
                Continuar →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5 rounded-2xl bg-surface p-5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-5xl font-black tabular-nums text-primary">{money(total)}</div>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { v: "efectivo", l: "Efectivo" },
                { v: "tarjeta", l: "Tarjeta" },
                { v: "transferencia", l: "Transfer." },
              ].map((m) => (
                <button key={m.v} onClick={() => setMethod(m.v)}
                  className={`tap-hi rounded-xl py-4 text-sm font-semibold ${method === m.v ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-surface-2"}`}>
                  {m.l}
                </button>
              ))}
            </div>
            {method === "efectivo" && (
              <div className="mb-4 space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Recibido</label>
                <input type="number" inputMode="decimal" value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  className="w-full rounded-xl bg-surface px-4 py-4 text-2xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cambio</span>
                  <span className="font-bold tabular-nums">{money(change)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep("preview")} className="flex-1 rounded-xl bg-surface py-4 font-semibold">← Volver</button>
              <button onClick={() => onPay({ method, received: Number(received || total) })}
                className="tap-hi flex-1 rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground">
                Confirmar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
