import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminTabs } from "@/components/AdminTabs";
import type { CategoryRow } from "@/lib/pos";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categorias")({ component: AdminCats });

function AdminCats() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🍽️");

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nombre requerido");
      const { error } = await supabase.from("categories").insert({ name: name.trim(), icon, sort_order: cats.length });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Agregada"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <AdminTabs />
        <div className="flex items-center gap-2 border-b border-border px-8 py-4">
          <input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-16 rounded-xl bg-surface px-3 py-3 text-center text-xl outline-none" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre categoría" className="flex-1 rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" onKeyDown={(e) => e.key === "Enter" && add.mutate()} />
          <button onClick={() => add.mutate()} className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            <Plus className="h-5 w-5" /> Agregar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                <div className="text-3xl">{c.icon}</div>
                <div className="flex-1 font-semibold">{c.name}</div>
                <button onClick={() => confirm("¿Eliminar?") && del.mutate(c.id)} className="rounded-lg bg-surface-2 p-2 text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
