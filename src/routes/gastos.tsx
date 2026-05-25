import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { money, type ExpenseRow } from "@/lib/pos";
import { Plus, Trash2, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/gastos")({ component: ExpensesPage });

function todayStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function ExpensesPage() {
  const qc = useQueryClient();
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", date],
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data } = await supabase.from("expenses").select("*").eq("date", date).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: sales = 0 } = useQuery({
    queryKey: ["sales-of-day", date],
    queryFn: async () => {
      const start = new Date(date + "T00:00:00").toISOString();
      const end = new Date(date + "T23:59:59").toISOString();
      const { data } = await supabase.from("orders").select("total").eq("status", "paid").gte("closed_at", start).lte("closed_at", end);
      return (data ?? []).reduce((s, r) => s + Number(r.total), 0);
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!concept.trim() || !amount) throw new Error("Concepto y monto requeridos");
      const { error } = await supabase.from("expenses").insert({
        concept: concept.trim(), amount: Number(amount), date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setConcept(""); setAmount("");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("expenses").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net = sales - totalExpenses;

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border bg-surface/40 px-8 py-5">
          <div>
            <h1 className="text-3xl font-bold">Gastos diarios</h1>
            <p className="text-sm text-muted-foreground">Insumos, compras y otros gastos del día</p>
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-xl bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-primary" />
        </header>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
          <KPI icon={<TrendingUp />} label="Ventas del día" value={money(sales)} tone="success" />
          <KPI icon={<TrendingDown />} label="Gastos del día" value={money(totalExpenses)} tone="warning" />
          <KPI icon={<Wallet />} label="Utilidad neta" value={money(net)} tone={net >= 0 ? "primary" : "destructive"} />
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-3xl bg-surface/40 p-5">
            <h2 className="mb-3 text-lg font-bold">Nuevo gasto</h2>
            <div className="space-y-3">
              <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concepto (pollo, gas, mesero…)"
                className="w-full rounded-xl bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto en C$"
                className="w-full rounded-xl bg-surface px-4 py-3 text-2xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={() => add.mutate()} className="tap-hi flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground">
                <Plus className="h-5 w-5" /> Registrar gasto
              </button>
            </div>
          </div>
          <div className="rounded-3xl bg-surface/40 p-5">
            <h2 className="mb-3 text-lg font-bold">Gastos del {new Date(date).toLocaleDateString("es-NI")}</h2>
            {expenses.length === 0 ? (
              <div className="rounded-xl bg-surface p-8 text-center text-sm text-muted-foreground">Sin gastos registrados</div>
            ) : (
              <ul className="space-y-2">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                    <div className="flex-1 font-semibold">{e.concept}</div>
                    <div className="text-lg font-bold tabular-nums text-warning">−{money(e.amount)}</div>
                    <button onClick={() => del.mutate(e.id)} className="tap-hi rounded-lg p-2 text-destructive hover:bg-destructive/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
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
    <div className={`rounded-3xl p-5 ring-2 ring-inset ${map}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tabular-nums">{value}</div>
    </div>
  );
}
