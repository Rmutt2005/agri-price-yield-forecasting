"use client";

import * as React from "react";

import { cn } from "@/components/ui/cn";

type Props = {
  children: React.ReactNode;
  imageUrl?: string;
  className?: string;
};

export function BackgroundImageWrapper({
  children,
  imageUrl,
  className,
}: Props) {
  return (
    <div className={cn("relative min-h-screen", className)}>
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      />

      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sand-50/70 via-sand-50/60 to-sand-50/40 dark:from-[#071816]/70 dark:via-[#071816]/50 dark:to-[#071816]/20" />

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_12%_18%,rgba(58,168,121,0.18),transparent_55%),radial-gradient(700px_circle_at_88%_22%,rgba(241,215,125,0.20),transparent_60%)] dark:bg-[radial-gradient(900px_circle_at_10%_18%,rgba(85,195,138,0.12),transparent_55%),radial-gradient(700px_circle_at_90%_20%,rgba(241,215,125,0.10),transparent_60%)]" />

      <div className="relative">{children}</div>
    </div>
  );
}
