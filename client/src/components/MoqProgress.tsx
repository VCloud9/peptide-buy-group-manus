import { cn } from "@/lib/utils";

interface Props {
  current: number;
  target: number;
  className?: string;
  showLabel?: boolean;
}

export function MoqProgress({ current, target, className, showLabel = true }: Props) {
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  const reached = pct >= 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">MOQ Progress</span>
          <span className={cn("font-semibold tabular-nums", reached ? "text-primary" : "text-foreground")}>
            ${current.toLocaleString()} / ${target.toLocaleString()}
          </span>
        </div>
      )}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            reached ? "bg-primary" : "bg-primary/60"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground text-right">
          {pct.toFixed(0)}% of MOQ {reached ? "✓ Reached" : ""}
        </p>
      )}
    </div>
  );
}
