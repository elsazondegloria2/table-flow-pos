import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminTabs } from "@/components/AdminTabs";
import { money, type ProductRow, type CategoryRow } from "@/lib/pos";
import { Plus, Trash2, Pencil, Upload, Image as ImageIcon } from "lucide-react";
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
          name: p.name!, price: Number(p.price ?? 0), category_id: p.category_id,
          emoji: p.emoji, image_url: p.image_url, available: p.available ?? true,
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({
          name: p.name!, price: Number(p.price ?? 0), category_id: p.category_id,
          emoji: p.emoji ?? "🍽️", image_url: p.image_url, available: p.available ?? true,
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

  const toggleAvail = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase.from("products").update({ available: !p.available }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
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
          <div className="text-sm text-muted-foreground">
            {products.length} productos · {products.filter((p) => p.available).length} disponibles hoy
          </div>
          <button
            onClick={() => setEditing({ name: "", emoji: "🍽️", available: true })}
            className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            <Plus className="h-5 w-5" /> Nuevo platillo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-2xl bg-surface p-3 ${!p.available && "opacity-60"}`}>
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">{p.emoji ?? "🍽️"}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-sm text-primary">{money(p.price)}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {cats.find((c) => c.id === p.category_id)?.name ?? "Sin categoría"}
                  </div>
                </div>
                <button
                  onClick={() => toggleAvail.mutate(p)}
                  title={p.available ? "Quitar del menú de hoy" : "Agregar al menú de hoy"}
                  className={`tap-hi rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                    p.available ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {p.available ? "Hoy ✓" : "Off"}
                </button>
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

        {editing && <EditModal editing={editing} setEditing={setEditing} cats={cats} onSave={(p) => save.mutate(p)} />}

        <style>{`.input { width: 100%; border-radius: 0.75rem; background: var(--color-surface); padding: 0.75rem 1rem; outline: none; color: var(--color-foreground); }`}</style>
      </div>
    </AppShell>
  );
}

function EditModal({
  editing, setEditing, cats, onSave,
}: {
  editing: Partial<ProductRow>;
  setEditing: (p: Partial<ProductRow> | null) => void;
  cats: CategoryRow[];
  onSave: (p: Partial<ProductRow>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setEditing({ ...editing, image_url: data.publicUrl });
      toast.success("Foto subida");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-bold">{editing.id ? "Editar" : "Nuevo"} platillo</h3>

        <div className="mb-4 flex items-center gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-2xl bg-surface ring-2 ring-border">
            {editing.image_url ? (
              <img src={editing.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">{editing.emoji ?? "🍽️"}</div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="tap-hi flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Upload className="h-4 w-4" /> {uploading ? "Subiendo…" : editing.image_url ? "Cambiar foto" : "Subir foto"}
            </button>
            {editing.image_url && (
              <button onClick={() => setEditing({ ...editing, image_url: null })}
                className="tap-hi flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs hover:bg-surface-2">
                <ImageIcon className="h-3 w-3" /> Usar emoji
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Nombre">
            <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio (C$)">
              <input type="text" inputMode="decimal" value={editing.price ?? ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setEditing({ ...editing, price: v === "" ? (null as unknown as number) : Number(v) });
                }} className="input" />
            </Field>
            <Field label="Emoji (fallback)">
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
            <input type="checkbox" checked={editing.available ?? true}
              onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-primary)]" />
            Disponible en el menú de hoy
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={() => setEditing(null)} className="flex-1 rounded-xl bg-surface py-3 font-semibold">Cancelar</button>
          <button onClick={() => onSave(editing)} className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground">Guardar</button>
        </div>
      </div>
    </div>
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
