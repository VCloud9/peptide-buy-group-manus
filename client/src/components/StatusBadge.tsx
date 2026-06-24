import { cn } from "@/lib/utils";
import type { BuyStatus, OrderStatus, TestStatus } from "../../../shared/types";

const buyStatusClass: Record<BuyStatus, string> = {
  Draft: "status-draft",
  Gathering: "status-gathering",
  Funded: "status-funded",
  Ordered: "status-ordered",
  Testing: "status-testing",
  Distributing: "status-distributing",
  Complete: "status-complete",
};

const orderStatusClass: Record<OrderStatus, string> = {
  Committed: "pay-committed",
  "Payment Pending": "pay-pending",
  Paid: "pay-paid",
  Shipped: "pay-shipped",
};

const testStatusClass: Record<TestStatus, string> = {
  Pending: "status-draft",
  "Samples Sent": "status-gathering",
  "In Testing": "status-testing",
  "Results Ready": "status-funded",
  Published: "status-complete",
  Failed: "bg-red-950 text-red-300 border border-red-800",
};

interface Props {
  status: BuyStatus | OrderStatus | TestStatus;
  type: "buy" | "order" | "test";
  className?: string;
}

export function StatusBadge({ status, type, className }: Props) {
  let cls = "";
  if (type === "buy") cls = buyStatusClass[status as BuyStatus] ?? "status-draft";
  else if (type === "order") cls = orderStatusClass[status as OrderStatus] ?? "pay-committed";
  else cls = testStatusClass[status as TestStatus] ?? "status-draft";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide",
        cls,
        className
      )}
    >
      {status}
    </span>
  );
}
