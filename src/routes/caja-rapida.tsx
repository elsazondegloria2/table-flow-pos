import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/caja-rapida")({
  beforeLoad: () => { throw redirect({ to: "/llevar" }); },
});
