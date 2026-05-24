import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminTabs } from "@/components/AdminTabs";
import type { TableRow } from "@/lib/pos";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/mesas")({ component: AdminTables });

function AdminTables() {
  const qc = useQueryClient();
  const [num, setNum] = useState("");
  const [cap, setCap] = useState("4");

  const { data: tables = [] } = useQuery({
    queryKey: ["admin-tables"],
    queryFn: async (): Promise<TableRow[]> => {
      const { data } = await supabase.from("tables").select("*").order("number");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const n = Number(num);
      if (!n) throw new Error("Número requerido");
      const { error } = await supabase.from("tables").insert({ number: n, capacity: Number(cap || 4) });
      if (error) throw error;
    },
    onSuccess: () => { setNum(""); qc.invalidateQueries({ queryKey: ["admin-tables"] }); qc.invalidateQueries({ queryKey: ["tables-with-orders"] }); toast.success("Mesa agregada"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tables").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tables"] }); qc.invalidateQueries({ queryKey: ["tables-with-orders"] }); },
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <AdminTabs />
        <div className="flex items-center gap-2 border-b border-border px-8 py-4">
          <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="Número" type="number" className="w-32 rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          <input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Capacidad" type="number" className="w-32 rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" onKeyDown={(e) => e.key === "Enter" && add.mutate()} />
          <button onClick={() => add.mutate()} className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            <Plus className="h-5 w-5" /> Agregar mesa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {tables.map((t) => (
              <div key={t.id} className="flex flex-col items-center gap-1 rounded-2xl bg-surface p-4">
                <div className="text-4xl font-black">{t.number}</div>
                <div className="text-xs text-muted-foreground">{t.capacity} personas</div>
                <div className="text-[10px] uppercase">{t.status}</div>
                <button onClick={() => confirm(`¿Eliminar mesa ${t.number}?`) && del.mutate(t.id)} className="mt-1 rounded-lg bg-surface-2 p-2 text-destructive hover:bg-destructive/20">
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
