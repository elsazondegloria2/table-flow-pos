import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OrderScreen } from "@/components/OrderScreen";

export const Route = createFileRoute("/llevar/$orderId")({ component: TakeawayOrder });

function TakeawayOrder() {
  const { orderId } = Route.useParams();
  return (
    <AppShell>
      <OrderScreen orderId={orderId} mode="takeaway" />
    </AppShell>
  );
}
