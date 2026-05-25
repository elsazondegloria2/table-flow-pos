import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OrderScreen } from "@/components/OrderScreen";

export const Route = createFileRoute("/delivery/$orderId")({ component: DeliveryOrder });

function DeliveryOrder() {
  const { orderId } = Route.useParams();
  return (
    <AppShell>
      <OrderScreen orderId={orderId} mode="delivery" />
    </AppShell>
  );
}
