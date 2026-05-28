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

            <BackupSection />

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

function BackupSection() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const download = (filename: string, content: string, type = "application/json") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportBackup = async () => {
    setBusy("export");
    try {
      const dump: Record<string, unknown[]> = {};
      for (const t of BACKUP_TABLES) {
        const { data, error } = await supabase.from(t).select("*");
        if (error) throw error;
        dump[t] = data ?? [];
      }
      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        tables: dump,
      };
      const stamp = new Date().toISOString().slice(0, 10);
      download(`respaldo-sazon-${stamp}.json`, JSON.stringify(payload, null, 2));
      toast.success("Respaldo descargado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  const importBackup = async (file: File) => {
    if (!confirm("Esto REEMPLAZARÁ todos los datos actuales con los del archivo. ¿Continuar?")) return;
    setBusy("import");
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as { tables: Record<string, unknown[]> };
      // Borrar en orden inverso (respetar dependencias lógicas)
      for (const t of [...BACKUP_TABLES].reverse()) {
        const { error } = await supabase.from(t).delete().gte("created_at", "1900-01-01");
        if (error && !error.message.includes("created_at")) {
          // Fallback para tablas sin created_at filtrable
          await supabase.from(t).delete().not("id", "is", null);
        }
      }
      // Insertar de nuevo
      for (const t of BACKUP_TABLES) {
        const rows = payload.tables[t];
        if (!rows || rows.length === 0) continue;
        const { error } = await supabase.from(t).insert(rows as never);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      qc.invalidateQueries();
      toast.success("Respaldo restaurado");
    } catch (e) {
      toast.error("Error al restaurar: " + (e as Error).message);
    } finally { setBusy(null); }
  };

  const resetReports = async () => {
    if (!confirm("Se borrarán TODAS las órdenes, gastos y registros de personal (asistencias, consumos, pagos). Los productos, mesas, empleados y ajustes se conservan. ¿Continuar?")) return;
    if (!confirm("Última confirmación: esta acción NO se puede deshacer. ¿Continuar?")) return;
    setBusy("reset");
    try {
      for (const t of RESET_REPORT_TABLES) {
        const { error } = await supabase.from(t).delete().not("id", "is", null);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      // Liberar mesas
      await supabase.from("tables").update({ status: "free", opened_at: null, guests: 0 }).not("id", "is", null);
      qc.invalidateQueries();
      toast.success("Datos restablecidos");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  const resetAll = async () => {
    if (!confirm("⚠ BORRADO TOTAL: se eliminarán productos, categorías, mesas, empleados, órdenes, gastos y todo lo demás. Sólo se conservarán los ajustes del negocio. ¿Continuar?")) return;
    if (!confirm("Esta acción NO se puede deshacer. Asegúrate de haber descargado un respaldo. ¿Continuar?")) return;
    setBusy("resetall");
    try {
      const tables = BACKUP_TABLES.filter((t) => t !== "restaurant_settings");
      for (const t of [...tables].reverse()) {
        const { error } = await supabase.from(t).delete().not("id", "is", null);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      qc.invalidateQueries();
      toast.success("Web restablecida desde cero");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  return (
    <section className="rounded-3xl bg-surface p-6">
      <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
        <Database className="h-5 w-5" /> Respaldo y restablecimiento
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Descarga una copia de seguridad de todos los datos (ventas, empleados, sueldos, productos, etc.) o restaura desde un archivo si migras a otro hosting.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={exportBackup}
          disabled={busy !== null}
          className="tap-hi flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-semibold text-primary-foreground disabled:opacity-40"
        >
          <Download className="h-5 w-5" />
          {busy === "export" ? "Generando…" : "Descargar respaldo (.json)"}
        </button>

        <input
          ref={fileRef} type="file" accept="application/json" hidden
          onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="tap-hi flex items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-4 font-semibold hover:bg-primary/20 disabled:opacity-40"
        >
          <Upload className="h-5 w-5" />
          {busy === "import" ? "Restaurando…" : "Cargar respaldo (.json)"}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-warning">
          <AlertTriangle className="h-5 w-5" /> Zona peligrosa
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={resetReports}
            disabled={busy !== null}
            className="tap-hi rounded-xl bg-warning/20 px-4 py-3 text-sm font-semibold text-warning hover:bg-warning/30 disabled:opacity-40"
          >
            Restablecer reportes (ventas y gastos)
          </button>
          <button
            onClick={resetAll}
            disabled={busy !== null}
            className="tap-hi rounded-xl bg-destructive/20 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/30 disabled:opacity-40"
          >
            Restablecer toda la web (entregar a otro restaurante)
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          "Restablecer reportes" borra órdenes, gastos y registros de personal pero conserva productos, mesas, empleados y ajustes. "Restablecer toda la web" deja sólo los ajustes del negocio.
        </p>
      </div>
    </section>
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
