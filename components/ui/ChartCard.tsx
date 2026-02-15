import * as React from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  right,
  className,
  children,
}: Props) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-ink-900 dark:text-slate-100">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-base text-ink-800/80 dark:text-slate-300/70">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
