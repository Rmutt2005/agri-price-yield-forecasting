import * as React from "react";

import { cn } from "@/components/ui/cn";

type Props = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white/25 via-white/15 to-white/5 shadow-2xl shadow-black/[0.06] backdrop-blur-2xl transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(700px_circle_at_18%_12%,rgba(255,255,255,0.35),transparent_55%)]before:opacity-70 before:content-[''] hover:-translate-y-0.5 hover:shadow-black/[0.10] dark:border-white/20 dark:bg-gradient-to-br dark:from-white/10 dark:via-white/5 dark:to-white/2 dark:shadow-black/40",
        className,
      )}
      {...props}
    />
  );
}
