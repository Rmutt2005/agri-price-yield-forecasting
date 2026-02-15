"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-12 transition-colors duration-300">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold text-ink-900 dark:text-slate-100">
            สมัครสมาชิก
          </div>
          <div className="mt-2 text-base text-ink-500 dark:text-slate-300">
            Prototype UI • ไม่ต้องยืนยันข้อมูล
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
                <User className="h-4 w-4" />
                ชื่อ–นามสกุล
              </div>
              <FormInput label="" name="fullName" placeholder="ชื่อ นามสกุล" />
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
                placeholder="••••••••"
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
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="mt-2">
              สร้างบัญชีและไปยังแดชบอร์ด
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
