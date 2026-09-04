"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, confirmPassword }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "สมัครสมาชิกไม่สำเร็จ");
      }
      router.push("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "สมัครสมาชิกไม่สำเร็จ",
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
            สมัครสมาชิก
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
                <User className="h-4 w-4" />
                ชื่อ–นามสกุล
              </div>
              <FormInput
                label=""
                name="fullName"
                value={fullName}
                disabled={loading}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ชื่อ นามสกุล"
              />
            </div>

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
                <Lock className="h-4 w-4" />
                รหัสผ่าน
              </div>
              <FormInput
                label=""
                name="password"
                type="password"
                value={password}
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-base font-medium text-ink-700 dark:text-slate-200">
                <Lock className="h-4 w-4" />
                ยืนยันรหัสผ่าน
              </div>
              <FormInput
                label=""
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                disabled={loading}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
              />
            </div>

            <Button type="submit" className="mt-2" disabled={loading}>
              {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชีและเข้าสู่ระบบ"}
            </Button>

            <div className="text-center text-base text-ink-500 dark:text-slate-300">
              มีบัญชีแล้ว?{" "}
              <Link
                href="/login"
                className="font-medium text-moss-600 hover:underline dark:text-moss-400"
              >
                เข้าสู่ระบบ
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
