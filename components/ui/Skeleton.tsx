import { cn } from "@/components/ui/cn";

type Props = {
  className?: string;
};

export function Skeleton({ className }: Props) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-br from-white/40 via-white/25 to-white/10 dark:from-white/15 dark:via-white/10 dark:to-white/5",
        className,
      )}
    />
  );
}
