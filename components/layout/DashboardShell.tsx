"use client";

import * as React from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

type Props = {
  title?: string;
  children: React.ReactNode;
};

export function DashboardShell({ title, children }: Props) {
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

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
