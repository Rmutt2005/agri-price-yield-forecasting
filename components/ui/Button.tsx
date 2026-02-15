import * as React from "react";

import { cn } from "@/components/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  className,
  variant = "primary",
  leftIcon,
  rightIcon,
  children,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-medium tracking-tight transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-[#071816]";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-b from-moss-500 to-moss-600 text-white shadow-2xl shadow-black/[0.10] ring-1 ring-white/20 hover:-translate-y-0.5 hover:from-moss-400 hover:to-moss-500 hover:shadow-black/[0.14] active:translate-y-0 dark:from-moss-400 dark:to-moss-500 dark:ring-white/10",
    secondary:
      "border border-white/40 bg-gradient-to-br from-white/35 via-white/25 to-white/10 text-ink-900 shadow-2xl shadow-black/[0.06] backdrop-blur-2xl hover:-translate-y-0.5 hover:from-white/45 hover:via-white/30 hover:shadow-black/[0.10] dark:border-white/20 dark:from-white/15 dark:via-white/10 dark:to-white/5 dark:text-slate-100",
    ghost:
      "text-ink-700 hover:bg-white/30 hover:backdrop-blur-2xl dark:text-slate-200 dark:hover:bg-white/8",
  };

  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}
