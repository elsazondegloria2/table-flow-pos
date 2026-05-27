import type { Database } from "@/integrations/supabase/types";

export type TableRow = Database["public"]["Tables"]["tables"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ExtraRow = Database["public"]["Tables"]["extras"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemExtraRow = Database["public"]["Tables"]["order_item_extras"]["Row"];
export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
export type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
export type AttendanceRow = Database["public"]["Tables"]["employee_attendance"]["Row"];
export type ConsumptionRow = Database["public"]["Tables"]["employee_consumption"]["Row"];
export type PayrollRow = Database["public"]["Tables"]["employee_payroll"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["restaurant_settings"]["Row"];

/**
 * Imprime contenido HTML directamente al diálogo del sistema (térmica 80 mm).
 * Usa un iframe oculto para evitar que el navegador "Guarde como PDF" por defecto
 * y abre el cuadro de impresión donde se selecciona la AON Business PR‑200.
 */
export function printThermal(innerHtml: string, title = "Ticket") {
  const css = `
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: ui-monospace, "Menlo", monospace; font-size: 12px; padding: 6px 8px; width: 80mm; }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .right { text-align: right; white-space: nowrap; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .total { font-size: 16px; font-weight: 900; }
    .big { font-size: 28px; font-weight: 900; letter-spacing: 1px; }
    .huge { font-size: 56px; font-weight: 900; line-height: 1; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }
  `;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${innerHtml}</body></html>`;
  // Remove any previous print iframe
  document.querySelectorAll("iframe[data-print-frame]").forEach((n) => n.remove());
  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-print-frame", "1");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  const trigger = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => iframe.remove(), 1500);
  };
  // Wait for the iframe to be ready
  if (iframe.contentWindow?.document.readyState === "complete") setTimeout(trigger, 80);
  else iframe.addEventListener("load", () => setTimeout(trigger, 80));
}

export type OrderType = "dine_in" | "takeaway" | "delivery" | "quick_sale";

export const RESTAURANT = {
  name: "El Sazón de Gloria",
  tagline: "Almuerzos Caseros",
};

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
  quick: "Caja rápida",
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
