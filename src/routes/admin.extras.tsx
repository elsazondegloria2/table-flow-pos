import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminTabs } from "@/components/AdminTabs";
import { money, type ExtraRow } from "@/lib/pos";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/extras")({ component: AdminExtras });

function AdminExtras() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const { data: extras = [] } = useQuery({
    queryKey: ["extras"],
    queryFn: async (): Promise<ExtraRow[]> => {
      const { data } = await supabase.from("extras").select("*").order("name");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nombre requerido");
      const { error } = await supabase.from("extras").insert({ name: name.trim(), price: Number(price || 0) });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setPrice(""); qc.invalidateQueries({ queryKey: ["extras"] }); toast.success("Agregado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("extras").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["extras"] }),
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <AdminTabs />
        <div className="flex items-center gap-2 border-b border-border px-8 py-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del extra" className="flex-1 rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Precio" type="number" step="0.01" className="w-32 rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" onKeyDown={(e) => e.key === "Enter" && add.mutate()} />
          <button onClick={() => add.mutate()} className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            <Plus className="h-5 w-5" /> Agregar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {extras.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                <div className="flex-1">
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-sm text-primary">{money(e.price)}</div>
                </div>
                <button onClick={() => confirm("¿Eliminar?") && del.mutate(e.id)} className="rounded-lg bg-surface-2 p-2 text-destructive hover:bg-destructive/20">
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
