import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1", ORDER_STATUS_TONE[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
