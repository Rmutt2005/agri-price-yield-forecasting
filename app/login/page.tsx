"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-12 transition-colors duration-300">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold text-ink-900 dark:text-slate-100">
            เข้าสู่ระบบ
          </div>
          <div className="mt-2 text-base text-ink-500 dark:text-slate-300">
            Prototype UI • กรอกข้อมูลใดก็ได้แล้วไปต่อได้ทันที
          </div>
        </div>

        <Card className="p-7">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/dashboard");
            }}
          >
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-base font-medium text-ink-700 dark:text-slate-200">
                <Mail className="h-4 w-4" />
                อีเมล
              </div>
              <FormInput
                label=""
                name="email"
                type="email"
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
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="mt-2">
              เข้าสู่ระบบ
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
