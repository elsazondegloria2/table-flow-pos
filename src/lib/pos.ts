import type { Database } from "@/integrations/supabase/types";

export type TableRow = Database["public"]["Tables"]["tables"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ExtraRow = Database["public"]["Tables"]["extras"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemExtraRow = Database["public"]["Tables"]["order_item_extras"]["Row"];
export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

export type OrderType = "dine_in" | "takeaway" | "delivery" | "quick_sale";

export const money = (n: number | null | undefined) =>
  `C$ ${Number(n ?? 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function elapsed(from: string | null): string {
  if (!from) return "—";
  const ms = Date.now() - new Date(from).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: "Mesa",
  takeaway: "Para llevar",
  delivery: "Delivery",
  quick_sale: "Caja rápida",
};

export const TABLE_STATUS_META: Record<
  string,
  { label: string; bg: string; ring: string; dot: string }
> = {
  free: {
    label: "Libre",
    bg: "bg-surface hover:bg-surface-2",
    ring: "ring-success/30",
    dot: "bg-success",
  },
  occupied: {
    label: "Ocupada",
    bg: "bg-destructive/15 hover:bg-destructive/20",
    ring: "ring-destructive/50",
    dot: "bg-destructive",
  },
  awaiting_payment: {
    label: "Cuenta",
    bg: "bg-warning/15 hover:bg-warning/20",
    ring: "ring-warning/50",
    dot: "bg-warning",
  },
  reserved: {
    label: "Reservada",
    bg: "bg-info/15 hover:bg-info/20",
    ring: "ring-info/50",
    dot: "bg-info",
  },
};
