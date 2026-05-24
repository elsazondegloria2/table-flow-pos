import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminTabs } from "@/components/AdminTabs";
import { money, type ProductRow, type CategoryRow } from "@/lib/pos";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/productos")({ component: AdminProducts });

function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<ProductRow> | null>(null);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data } = await supabase.from("products").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<ProductRow>) => {
      if (p.id) {
        const { error } = await supabase.from("products").update({
          name: p.name!, price: Number(p.price ?? 0), category_id: p.category_id, emoji: p.emoji, available: p.available ?? true,
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({
          name: p.name!, price: Number(p.price ?? 0), category_id: p.category_id, emoji: p.emoji ?? "🍽️",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
      toast.success("Guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <AdminTabs />
        <div className="flex items-center justify-between border-b border-border px-8 py-4">
          <div className="text-sm text-muted-foreground">{products.length} productos</div>
          <button
            onClick={() => setEditing({ name: "", price: 0, emoji: "🍽️", available: true })}
            className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            <Plus className="h-5 w-5" /> Nuevo producto
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                <div className="text-3xl">{p.emoji ?? "🍽️"}</div>
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-primary">{money(p.price)}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {cats.find((c) => c.id === p.category_id)?.name ?? "Sin categoría"}
                    {!p.available && " · No disponible"}
                  </div>
                </div>
                <button onClick={() => setEditing(p)} className="tap-hi rounded-lg bg-surface-2 p-2 hover:bg-primary/20">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => confirm("¿Eliminar?") && del.mutate(p.id)} className="tap-hi rounded-lg bg-surface-2 p-2 text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
            <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-xl font-bold">{editing.id ? "Editar" : "Nuevo"} producto</h3>
              <div className="space-y-3">
                <Field label="Nombre">
                  <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio">
                    <input type="number" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className="input" />
                  </Field>
                  <Field label="Emoji">
                    <input value={editing.emoji ?? ""} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} className="input" />
                  </Field>
                </div>
                <Field label="Categoría">
                  <select value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })} className="input">
                    <option value="">— Sin categoría —</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.available ?? true} onChange={(e) => setEditing({ ...editing, available: e.target.checked })} className="h-4 w-4 accent-[var(--color-primary)]" />
                  Disponible
                </label>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setEditing(null)} className="flex-1 rounded-xl bg-surface py-3 font-semibold">Cancelar</button>
                <button onClick={() => save.mutate(editing)} className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground">Guardar</button>
              </div>
            </div>
          </div>
        )}

        <style>{`.input { width: 100%; border-radius: 0.75rem; background: var(--color-surface); padding: 0.75rem 1rem; outline: none; color: var(--color-foreground); }`}</style>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
