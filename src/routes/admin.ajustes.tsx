import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminTabs } from "@/components/AdminTabs";
import { Plus, Save, Trash2, Download, Upload, AlertTriangle, Database } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ajustes")({ component: Ajustes });

// Tablas incluidas en el respaldo completo (datos operativos)
const BACKUP_TABLES = [
  "restaurant_settings",
  "categories",
  "products",
  "extras",
  "tables",
  "orders",
  "order_items",
  "order_item_extras",
  "expenses",
  "employees",
  "employee_attendance",
  "employee_consumption",
  "employee_payroll",
] as const;

// Tablas que se vacían al "Restablecer reportes" (sólo histórico de ventas/gastos)
const RESET_REPORT_TABLES = [
  "order_item_extras",
  "order_items",
  "orders",
  "expenses",
  "employee_attendance",
  "employee_consumption",
  "employee_payroll",
] as const;

function Ajustes() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["restaurant-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ruc, setRuc] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [newProvider, setNewProvider] = useState("");

  useEffect(() => {
    if (!settings) return;
    setName(settings.name ?? "");
    setTagline(settings.tagline ?? "");
    setPhone(settings.phone ?? "");
    setAddress(settings.address ?? "");
    setRuc(settings.ruc ?? "");
    setProviders((settings.delivery_providers as string[] | null) ?? []);
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!settings) {
        const { error } = await supabase.from("restaurant_settings").insert({
          name, tagline, phone, address, ruc, delivery_providers: providers,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("restaurant_settings").update({
          name, tagline, phone, address, ruc, delivery_providers: providers,
          updated_at: new Date().toISOString(),
        }).eq("id", settings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ajustes guardados");
      qc.invalidateQueries({ queryKey: ["restaurant-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addProvider = () => {
    const v = newProvider.trim();
    if (!v) return;
    if (providers.includes(v)) { toast.error("Ya existe"); return; }
    setProviders([...providers, v]);
    setNewProvider("");
  };

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-hidden">
        <AdminTabs />
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <section className="rounded-3xl bg-surface p-6">
              <h2 className="mb-4 text-xl font-bold">Datos del negocio</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" value={name} onChange={setName} />
                <Field label="Eslogan" value={tagline} onChange={setTagline} />
                <Field label="Teléfono" value={phone} onChange={setPhone} />
                <Field label="RUC" value={ruc} onChange={setRuc} />
                <div className="sm:col-span-2">
                  <Field label="Dirección" value={address} onChange={setAddress} />
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-surface p-6">
              <h2 className="text-xl font-bold">Proveedores de delivery</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Personaliza los nombres que aparecen al tomar fila en caja (ej. Hugo, PedidosYa, Juan moto, etc.)
              </p>
              <ul className="mb-3 space-y-2">
                {providers.map((p, i) => (
                  <li key={p} className="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-3">
                    <span className="flex-1 font-semibold">{p}</span>
                    <button
                      onClick={() => setProviders(providers.filter((_, j) => j !== i))}
                      className="text-destructive hover:bg-destructive/10 rounded-lg p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {providers.length === 0 && (
                  <li className="rounded-xl bg-surface-2/50 px-4 py-6 text-center text-sm text-muted-foreground">
                    Aún no hay proveedores. Agrega uno abajo.
                  </li>
                )}
              </ul>
              <div className="flex gap-2">
                <input
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProvider()}
                  placeholder="Nuevo proveedor (ej. Carlos moto)"
                  className="flex-1 rounded-xl bg-surface-2 px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={addProvider}
                  className="tap-hi flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Agregar
                </button>
              </div>
            </section>

            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="tap-hi flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-40"
            >
              <Save className="h-5 w-5" /> Guardar ajustes
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-surface-2 px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  );
}
