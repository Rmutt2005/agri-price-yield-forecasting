"use client";

import Link from "next/link";
import { ArrowRight, Leaf, Moon, ShieldCheck, Sprout, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/components/layout/ThemeClient";

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full max-w-xl">
              <div className="rounded-3xl border border-white/40 bg-white/25 p-7 shadow-xl shadow-black/[0.04] backdrop-blur-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/[0.07] dark:border-white/10 dark:bg-white/5">
                <div className="max-w-2xl">
                  <div className="mb-4 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={toggle}
                      className="rounded-full"
                      leftIcon={
                        theme === "dark" ? (
                          <Sun className="h-4 w-4" />
                        ) : (
                          <Moon className="h-4 w-4" />
                        )
                      }
                    >
                      {theme === "dark" ? "Light" : "Dark"}
                    </Button>
                  </div>
                  <h1 className="mt-6 text-3xl font-semibold leading-[1.18] text-ink-900 dark:text-slate-100 sm:text-4xl lg:text-5xl">
                    ระบบวิเคราะห์พยากรณ์ราคาและผลผลิตทางการเกษตร
                  </h1>
                  <p className="mt-6 text-base leading-relaxed text-ink-500 dark:text-slate-300 sm:text-lg">
                    ช่วยให้คุณเห็นภาพรวมผลผลิตคาดการณ์ แนวโน้มราคาพืชผล
                    ความเสี่ยงโรคพืช รวมถึงรายได้-ต้นทุน-จุดคุ้มทุน
                    ผ่านแดชบอร์ดที่อ่านง่ายและรองรับมือถือ
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button
                        className="w-full"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                      >
                        เข้าสู่ระบบ
                      </Button>
                    </Link>
                    <Link href="/register" className="w-full sm:w-auto">
                      <Button variant="secondary" className="w-full">
                        สมัครสมาชิก
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
