"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

type Props = {
  title?: string;
  children: React.ReactNode;
};

export function DashboardShell({ title, children }: Props) {
  const router = useRouter();
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [authReady, setAuthReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/me")
      .then((response) => {
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        if (!cancelled) setAuthReady(true);
      })
      .catch(() => router.replace("/login"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center text-base text-ink-500 dark:text-slate-300">
        กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
        <div className="hidden md:block">
          <div className="sticky top-0 h-screen">
            <Sidebar
              expanded={sidebarExpanded}
              onToggleExpanded={() => setSidebarExpanded((v) => !v)}
              mobileOpen={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>

        <div className="min-w-0">
          <Navbar
            title={title}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          />

          <div className="md:hidden">
            <Sidebar
              expanded
              onToggleExpanded={() => setSidebarExpanded((v) => !v)}
              mobileOpen={mobileSidebarOpen}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>

          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
