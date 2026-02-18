"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Sprout, User } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { mockUser } from "@/lib/mockData";

const links = [
  { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
  { href: "/input", label: "กรอกข้อมูลการเพาะปลูก", icon: Sprout },
  { href: "/profile", label: "โปรไฟล์", icon: User },
  { href: "/", label: "ออกจากระบบ", icon: LogOut },
] as const;

type Props = {
  expanded: boolean;
  onToggleExpanded: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({
  expanded,
  onToggleExpanded,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 m-4 flex h-[90vh] flex-col rounded-3xl border border-white/20",
          "bg-white/80 md:bg-white/10",
          "dark:bg-slate-900/80 md:dark:bg-white/5",
          "shadow-xl shadow-black/[0.10] backdrop-blur-xl transition-all duration-300 ease-in-out",
          "md:static md:z-auto md:h-auto md:shadow-xl md:shadow-black/[0.08]",
          "w-64 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-[110%]",
          expanded ? "md:w-64" : "md:w-16",
        )}
      >
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-label={expanded ? "ย่อเมนู" : "ขยายเมนู"}
          className={cn(
            "flex w-full items-center text-left transition-all duration-300 hover:bg-white/10 dark:hover:bg-white/5",
            expanded ? "gap-3 px-4 py-5" : "justify-center px-2 py-5",
          )}
        >
          <div className="grid h-10 w-10 place-items-center rounded-3xl bg-moss-600 text-white shadow-lg shadow-black/[0.10] dark:bg-moss-500">
            <Sprout className="h-5 w-5" />
          </div>
          <div
            className={cn(
              "transition-all duration-300",
              expanded ? "opacity-100" : "w-0 overflow-hidden opacity-0",
            )}
          >
            <div className="text-base font-semibold leading-tight">
              {mockUser.fullName}
            </div>
            <div className="text-base text-slate-500 dark:text-slate-400">
              {mockUser.email}
            </div>
          </div>
        </button>

        <nav className={cn("px-3 pb-5", expanded ? "" : "px-2")}>
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={onCloseMobile}
                className={cn(
                  "mb-1.5 flex items-center rounded-2xl py-2.5 text-base transition-all duration-300",
                  expanded ? "gap-3 px-4 justify-start" : "px-0 justify-center",
                  active
                    ? "bg-white/25 text-ink-900 shadow-md shadow-black/[0.06] ring-1 ring-white/20 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
                    : "text-ink-700 hover:bg-white/20 hover:shadow-sm hover:shadow-black/[0.05] dark:text-slate-200 dark:hover:bg-white/8",
                )}
              >
                <Icon className="h-4 w-4" />
                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-300",
                    expanded ? "opacity-100" : "w-0 overflow-hidden opacity-0",
                  )}
                >
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "mt-auto px-5 pb-6 text-base text-slate-500 dark:text-slate-400 transition-all duration-300",
            expanded ? "opacity-100" : "h-0 overflow-hidden opacity-0",
          )}
        ></div>
      </aside>
    </>
  );
}
