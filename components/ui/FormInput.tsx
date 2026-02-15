import * as React from "react";

import { cn } from "@/components/ui/cn";

type Props = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  as?: "input" | "textarea" | "select";
  children?: React.ReactNode;
};

export function FormInput({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  as = "input",
  children,
}: Props) {
  return (
    <label className="grid gap-1.5">
      <span className="text-base font-medium text-ink-700 dark:text-slate-200">
        {label}
      </span>

      {as === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={cn(
            "min-h-[96px] w-full rounded-2xl border border-white/40 bg-gradient-to-br from-white/35 via-white/20 to-white/10 px-4 py-3 text-base text-ink-900 shadow-2xl shadow-black/[0.06] outline-none backdrop-blur-2xl transition-all duration-300 placeholder:text-ink-800/90 focus:border-moss-400/60 focus:ring-2 focus:ring-moss-400/25 dark:border-white/20 dark:from-white/15 dark:via-white/10 dark:to-white/5 dark:text-slate-100 dark:placeholder:text-slate-900/80",
          )}
        />
      ) : as === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={cn(
            "w-full rounded-2xl border border-white/40 bg-gradient-to-br from-white/35 via-white/20 to-white/10 px-4 py-3 text-base text-ink-900 shadow-2xl shadow-black/[0.06] outline-none backdrop-blur-2xl transition-all duration-300 focus:border-moss-400/60 focus:ring-2 focus:ring-moss-400/25 dark:border-white/20 dark:from-white/15 dark:via-white/10 dark:to-white/5 dark:text-slate-900",
          )}
        >
          {children}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={cn(
            "w-full rounded-2xl border border-white/40 bg-gradient-to-br from-white/35 via-white/20 to-white/10 px-4 py-3 text-base text-ink-900 shadow-2xl shadow-black/[0.06] outline-none backdrop-blur-2xl transition-all duration-300 placeholder:text-ink-800/90 focus:border-moss-400/60 focus:ring-2 focus:ring-moss-400/25 dark:border-white/20 dark:from-white/15 dark:via-white/10 dark:to-white/5 dark:text-slate-900 dark:placeholder:text-slate-900/80",
          )}
        />
      )}
    </label>
  );
}
