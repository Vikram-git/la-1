import { Badge } from "@/components/ui";
import { fulfilmentLabel, sourceLabel, statusLabel, statusTone, type Fulfilment, type OrderSource, type OrderStatus } from "@/lib/orders";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}

// Call, Customer and Online share a list, so their badges must look different, not just read differently (AC-01).
export function SourceBadge({ source }: { source: OrderSource }) {
  const styles: Record<OrderSource, string> = {
    IN_STORE: "border-line bg-canvas text-ink",
    CALL: "border-sky-300 bg-sky-50 text-sky-800",
    ONLINE: "border-violet-300 bg-violet-50 text-violet-800",
    CUSTOMER: "border-amber-300 bg-amber-50 text-amber-800",
  };
  const icons: Record<OrderSource, string> = { IN_STORE: "🏪", CALL: "📞", ONLINE: "🌐", CUSTOMER: "💬" };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${styles[source]}`}>
      <span aria-hidden>{icons[source]}</span>
      {sourceLabel[source]}
    </span>
  );
}

// Collect from the store is green, set up at the customer's place is red (owner, 2026-10-09).
export function FulfilmentBadge({ fulfilment }: { fulfilment: Fulfilment }) {
  const setup = fulfilment === "setup";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${
        setup ? "border-danger/40 bg-danger-soft text-danger" : "border-ok/40 bg-ok-soft text-ok"
      }`}
    >
      <span aria-hidden>{setup ? "🚚" : "🏪"}</span>
      {fulfilmentLabel[fulfilment]}
    </span>
  );
}
