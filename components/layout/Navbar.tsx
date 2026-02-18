"use client";

import Link from "next/link";
import { Menu, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/layout/ThemeClient";

type Props = {
  title?: string;
  onOpenMobileSidebar?: () => void;
};

export function Navbar({ title, onOpenMobileSidebar }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-16 items-center justify-between gap-3 border-b border-white/20 bg-white/10 px-4 backdrop-blur-xl rounded-3xl transition-colors duration-300 dark:border-white/10 dark:bg-white/5 lg:mx-4 lg:mt-4  lg:border lg:shadow-xl lg:shadow-black/[0.08]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="เปิดเมนู"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-ink-900 shadow-sm shadow-black/[0.06] backdrop-blur-xl transition-all duration-300 hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 z-50 md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="text-base font-semibold text-ink-900 dark:text-slate-100">
          {title ?? "แดชบอร์ด"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={toggle}
          className="rounded-full"
          leftIcon={
            <span className="transition-transform duration-300">
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </span>
          }
        >
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        <Link href="/dashboard" className="hidden sm:block">
          <Button variant="secondary">กลับหน้าแรก</Button>
        </Link>
      </div>
    </div>
  );
}
