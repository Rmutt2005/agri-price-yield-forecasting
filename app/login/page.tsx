"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Mail } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
      router.push("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "เข้าสู่ระบบไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 transition-colors duration-300">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold text-ink-900 dark:text-slate-100">
            เข้าสู่ระบบ
          </div>
        </div>

        <Card className="p-7">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-2xl border border-rose-300/50 bg-rose-100/40 px-4 py-3 text-base text-rose-800 dark:border-rose-300/20 dark:bg-rose-950/30 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-base font-medium text-ink-700 dark:text-slate-200">
                <Mail className="h-4 w-4" />
                อีเมล
              </div>
              <FormInput
                label=""
                name="email"
                type="email"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-base font-medium text-ink-700 dark:text-slate-200">
                <KeyRound className="h-4 w-4" />
                รหัสผ่าน
              </div>
              <FormInput
                label=""
                name="password"
                type="password"
                value={password}
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="mt-2" disabled={loading}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>

            <div className="text-center text-base text-ink-500 dark:text-slate-300">
              ยังไม่มีบัญชี?{" "}
              <Link
                href="/register"
                className="font-medium text-moss-600 hover:underline dark:text-moss-400"
              >
                สมัครสมาชิก
              </Link>
            </div>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-base text-ink-500 hover:underline dark:text-slate-300"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </main>
  );
}
