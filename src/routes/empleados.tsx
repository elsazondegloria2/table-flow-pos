import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money, type EmployeeRow, type AttendanceRow, type ConsumptionRow, type PayrollRow } from "@/lib/pos";
import { Plus, Trash2, Users, CalendarCheck, ShoppingBasket, Wallet, Gift, Palmtree, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/empleados")({ component: EmployeesPage });

const DAYS = [
  { v: "mon", l: "Lun" }, { v: "tue", l: "Mar" }, { v: "wed", l: "Mié" },
  { v: "thu", l: "Jue" }, { v: "fri", l: "Vie" }, { v: "sat", l: "Sáb" }, { v: "sun", l: "Dom" },
];
const STATUS_OPTS = [
  { v: "present", l: "Presente", c: "bg-success text-success-foreground" },
  { v: "absent", l: "Falta", c: "bg-destructive text-destructive-foreground" },
  { v: "day_off", l: "Libre", c: "bg-info text-info-foreground" },
  { v: "vacation", l: "Vacación", c: "bg-warning text-warning-foreground" },
  { v: "sick", l: "Enfermo", c: "bg-muted text-foreground" },
];

function startOfWeek(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 sun
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function EmployeesPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async (): Promise<EmployeeRow[]> => {
      const { data } = await supabase.from("employees").select("*").order("name");
      return data ?? [];
    },
  });

  const selected = employees.find((e) => e.id === selectedId) ?? employees[0] ?? null;

  return (
    <AppShell>
      <div className="flex h-full overflow-hidden">
        <aside className="flex w-72 flex-col border-r border-border bg-surface/30">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" /> Empleados</h2>
            <button onClick={() => setShowNew(true)} className="tap-hi rounded-lg bg-primary p-2 text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {employees.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Sin empleados</div>
            )}
            {employees.map((e) => (
              <button key={e.id} onClick={() => setSelectedId(e.id)}
                className={`tap-hi mb-1 w-full rounded-xl px-3 py-3 text-left ${
                  selected?.id === e.id ? "bg-primary/15 ring-2 ring-inset ring-primary/40" : "hover:bg-surface"
                }`}>
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-muted-foreground">{e.role ?? "—"} · {money(e.weekly_salary)}/sem</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {selected ? <EmployeeDetail employee={selected} /> : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Agrega o selecciona un empleado
            </div>
          )}
        </main>
      </div>

      {showNew && <NewEmployeeModal onClose={() => setShowNew(false)} onSaved={(id) => {
        qc.invalidateQueries({ queryKey: ["employees"] });
        setSelectedId(id); setShowNew(false);
      }} />}
    </AppShell>
  );
}

function NewEmployeeModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [dayOff, setDayOff] = useState("sun");

  const save = async () => {
    if (!name.trim()) return toast.error("Nombre requerido");
    const { data, error } = await supabase.from("employees").insert({
      name: name.trim(), role: role.trim() || null,
      weekly_salary: Number(salary) || 0, day_off: dayOff,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Empleado agregado");
    onSaved(data.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Nuevo empleado</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo"
          className="w-full rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Puesto (mesero, cocinero…)"
          className="w-full rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
        <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Salario semanal C$"
          className="w-full rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
        <div>
          <label className="mb-1 block text-xs uppercase text-muted-foreground">Día libre</label>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => (
              <button key={d.v} onClick={() => setDayOff(d.v)}
                className={`tap-hi rounded-lg px-3 py-2 text-sm font-semibold ${dayOff === d.v ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                {d.l}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">Guardar</button>
      </div>
    </div>
  );
}

function EmployeeDetail({ employee }: { employee: EmployeeRow }) {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });
  const weekEnd = weekDates[6];
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", employee.id, isoDate(weekStart)],
    queryFn: async (): Promise<AttendanceRow[]> => {
      const { data } = await supabase.from("employee_attendance").select("*")
        .eq("employee_id", employee.id)
        .gte("date", isoDate(weekStart)).lte("date", isoDate(weekEnd));
      return data ?? [];
    },
  });

  const { data: consumption = [] } = useQuery({
    queryKey: ["consumption", employee.id, isoDate(weekStart)],
    queryFn: async (): Promise<ConsumptionRow[]> => {
      const { data } = await supabase.from("employee_consumption").select("*")
        .eq("employee_id", employee.id).eq("paid", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["payrolls", employee.id],
    queryFn: async (): Promise<PayrollRow[]> => {
      const { data } = await supabase.from("employee_payroll").select("*")
        .eq("employee_id", employee.id).order("paid_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const setAttendance = useMutation({
    mutationFn: async ({ date, status, deduction, reason }: { date: string; status: string; deduction?: number; reason?: string }) => {
      await supabase.from("employee_attendance").upsert({
        employee_id: employee.id, date, status, deduction: deduction ?? 0, reason: reason ?? null,
      }, { onConflict: "employee_id,date" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", employee.id] }),
  });

  const consumed = useMemo(() => consumption.reduce((s, c) => s + Number(c.amount), 0), [consumption]);
  const deductions = useMemo(() => attendance.reduce((s, a) => s + Number(a.deduction), 0), [attendance]);
  const net = Number(employee.weekly_salary) - deductions - consumed;

  const [conConcept, setConConcept] = useState("");
  const [conAmount, setConAmount] = useState("");

  const addConsumption = useMutation({
    mutationFn: async () => {
      if (!conConcept.trim() || !conAmount) throw new Error("Concepto y monto requeridos");
      await supabase.from("employee_consumption").insert({
        employee_id: employee.id, concept: conConcept.trim(), amount: Number(conAmount),
      });
    },
    onSuccess: () => {
      setConConcept(""); setConAmount("");
      qc.invalidateQueries({ queryKey: ["consumption", employee.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delConsumption = useMutation({
    mutationFn: async (id: string) => { await supabase.from("employee_consumption").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consumption", employee.id] }),
  });

  const payWeek = useMutation({
    mutationFn: async () => {
      await supabase.from("employee_payroll").insert({
        employee_id: employee.id, kind: "weekly",
        period_start: isoDate(weekStart), period_end: isoDate(weekEnd),
        base_amount: employee.weekly_salary, deductions, consumption: consumed, net_paid: net,
      });
      const ids = consumption.map((c) => c.id);
      if (ids.length) await supabase.from("employee_consumption").update({ paid: true }).in("id", ids);
    },
    onSuccess: () => {
      toast.success("Pago semanal registrado");
      qc.invalidateQueries({ queryKey: ["payrolls", employee.id] });
      qc.invalidateQueries({ queryKey: ["consumption", employee.id] });
    },
  });

  const addBonus = useMutation({
    mutationFn: async (kind: "bonus" | "vacation") => {
      const amount = prompt(kind === "bonus" ? "Monto del aguinaldo C$:" : "Monto de vacaciones C$:");
      if (!amount) return;
      await supabase.from("employee_payroll").insert({
        employee_id: employee.id, kind, base_amount: Number(amount), net_paid: Number(amount),
      });
    },
    onSuccess: () => {
      toast.success("Registrado");
      qc.invalidateQueries({ queryKey: ["payrolls", employee.id] });
    },
  });

  const removeEmp = async () => {
    if (!confirm(`¿Eliminar a ${employee.name}? Se borra su historial.`)) return;
    await supabase.from("employees").delete().eq("id", employee.id);
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{employee.name}</h1>
          <p className="text-sm text-muted-foreground">
            {employee.role ?? "—"} · Salario {money(employee.weekly_salary)}/sem · Libre: {DAYS.find((d) => d.v === employee.day_off)?.l ?? "—"}
          </p>
        </div>
        <button onClick={removeEmp} className="tap-hi rounded-xl bg-destructive/15 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/25">
          <Trash2 className="mr-1 inline h-4 w-4" /> Eliminar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI icon={<Wallet />} label="Salario base" value={money(employee.weekly_salary)} tone="primary" />
        <KPI icon={<ShoppingBasket />} label="Consumo semana" value={money(consumed)} tone="warning" />
        <KPI icon={<CalendarCheck />} label="Descuentos faltas" value={money(deductions)} tone="destructive" />
        <KPI icon={<Wallet />} label="Neto a pagar" value={money(net)} tone={net >= 0 ? "success" : "destructive"} />
      </div>

      <div className="rounded-3xl bg-surface/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Asistencia semana</h2>
          <div className="flex gap-1">
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
              className="tap-hi rounded-lg bg-surface px-3 py-1.5 text-sm">‹</button>
            <span className="rounded-lg bg-surface px-3 py-1.5 text-sm">
              {weekStart.toLocaleDateString("es-NI", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("es-NI", { day: "numeric", month: "short" })}
            </span>
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
              className="tap-hi rounded-lg bg-surface px-3 py-1.5 text-sm">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((d, i) => {
            const date = isoDate(d);
            const a = attendance.find((x) => x.date === date);
            return (
              <div key={i} className="rounded-xl bg-surface p-2">
                <div className="text-center text-xs font-semibold text-muted-foreground">
                  {DAYS[(d.getDay() + 6) % 7].l}
                </div>
                <div className="mb-1 text-center text-lg font-bold tabular-nums">{d.getDate()}</div>
                <select
                  value={a?.status ?? ""}
                  onChange={(e) => {
                    const status = e.target.value;
                    if (!status) return;
                    const deduction = status === "absent" ? Number(employee.weekly_salary) / 7 : 0;
                    setAttendance.mutate({ date, status, deduction });
                  }}
                  className="w-full rounded-md bg-card px-1 py-1 text-[10px] outline-none"
                >
                  <option value="">—</option>
                  {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
                {a?.deduction ? (
                  <div className="mt-1 text-center text-[10px] text-destructive">-{money(a.deduction)}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-surface/40 p-5">
          <h2 className="mb-3 text-lg font-bold">Consumo pendiente</h2>
          <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
            <input value={conConcept} onChange={(e) => setConConcept(e.target.value)} placeholder="Comida, gaseosa…"
              className="rounded-lg bg-surface px-3 py-2 outline-none" />
            <input type="number" value={conAmount} onChange={(e) => setConAmount(e.target.value)} placeholder="C$"
              className="w-28 rounded-lg bg-surface px-3 py-2 text-right outline-none" />
            <button onClick={() => addConsumption.mutate()} className="tap-hi rounded-lg bg-primary px-4 text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {consumption.length === 0 ? (
            <div className="rounded-lg bg-surface p-4 text-center text-sm text-muted-foreground">Sin consumos pendientes</div>
          ) : (
            <ul className="space-y-1">
              {consumption.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                  <div className="flex-1 text-sm">{c.concept}</div>
                  <div className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString("es-NI")}</div>
                  <div className="font-bold tabular-nums text-warning">-{money(c.amount)}</div>
                  <button onClick={() => delConsumption.mutate(c.id)} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-surface/40 p-5">
          <h2 className="mb-3 text-lg font-bold">Pagos</h2>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <button onClick={() => payWeek.mutate()}
              className="tap-hi rounded-xl bg-primary p-3 text-center text-xs font-semibold text-primary-foreground">
              <Wallet className="mx-auto mb-1 h-5 w-5" /> Pagar semana
            </button>
            <button onClick={() => addBonus.mutate("bonus")}
              className="tap-hi rounded-xl bg-warning/20 p-3 text-center text-xs font-semibold text-warning">
              <Gift className="mx-auto mb-1 h-5 w-5" /> Aguinaldo
            </button>
            <button onClick={() => addBonus.mutate("vacation")}
              className="tap-hi rounded-xl bg-info/20 p-3 text-center text-xs font-semibold text-info">
              <Palmtree className="mx-auto mb-1 h-5 w-5" /> Vacaciones
            </button>
          </div>
          {payrolls.length === 0 ? (
            <div className="rounded-lg bg-surface p-4 text-center text-sm text-muted-foreground">Sin pagos aún</div>
          ) : (
            <ul className="space-y-1 max-h-80 overflow-y-auto">
              {payrolls.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    p.kind === "weekly" ? "bg-primary/20 text-primary"
                    : p.kind === "bonus" ? "bg-warning/20 text-warning" : "bg-info/20 text-info"
                  }`}>
                    {p.kind === "weekly" ? "Semana" : p.kind === "bonus" ? "Aguinaldo" : "Vacaciones"}
                  </span>
                  <span className="flex-1 text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleDateString("es-NI")}</span>
                  <span className="font-bold tabular-nums">{money(p.net_paid)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "success" | "warning" | "destructive" }) {
  const map = {
    primary: "bg-primary/15 ring-primary/30 text-primary",
    success: "bg-success/15 ring-success/30 text-success",
    warning: "bg-warning/15 ring-warning/30 text-warning",
    destructive: "bg-destructive/15 ring-destructive/30 text-destructive",
  }[tone];
  return (
    <div className={`rounded-2xl p-4 ring-2 ring-inset ${map}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-80">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>{label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}
