import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold tracking-tight text-primary-foreground">
        PB
      </span>
      <span className="font-semibold tracking-tight">Peptide Buy Group</span>
    </span>
  );
}
