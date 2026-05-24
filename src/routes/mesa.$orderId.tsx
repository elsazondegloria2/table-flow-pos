import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OrderScreen } from "@/components/OrderScreen";

export const Route = createFileRoute("/mesa/$orderId")({ component: MesaPage });

function MesaPage() {
  const { orderId } = Route.useParams();
  return (
    <AppShell>
      <OrderScreen orderId={orderId} mode="dine_in" />
    </AppShell>
  );
}
