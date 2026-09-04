"use client";

import * as React from "react";
import { Pencil, Save, User } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";
import type { AuthUser } from "@/lib/repositories/authRepository";

export default function ProfilePage() {
  const [editing, setEditing] = React.useState(false);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    void fetch("/api/me")
      .then(async (response) => {
        const payload = (await response.json()) as { user?: AuthUser; message?: string };
        if (!response.ok || !payload.user) throw new Error(payload.message ?? "กรุณาเข้าสู่ระบบ");
        setUser(payload.user);
        setFullName(payload.user.fullName);
        setEmail(payload.user.email);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        }),
      });
      const payload = (await response.json()) as { user?: AuthUser; message?: string };
      if (!response.ok || !payload.user) throw new Error(payload.message ?? "บันทึกข้อมูลไม่สำเร็จ");
      setUser(payload.user);
      setFullName(payload.user.fullName);
      setEmail(payload.user.email);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditing(false);
      setMessage("บันทึกข้อมูลเรียบร้อย");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="โปรไฟล์">
      <div className="grid gap-4">
        <Card className="p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white/35 text-moss-600 backdrop-blur-lg dark:bg-white/10 dark:text-moss-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base text-ink-500/80 dark:text-slate-300/70">
                  ข้อมูลผู้ใช้
                </div>
                <div className="text-lg font-semibold text-ink-900 dark:text-slate-100">
                  {fullName}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!editing ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing(true)}
                  leftIcon={<Pencil className="h-4 w-4" />}
                >
                  แก้ไขข้อมูล
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving || loading}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  บันทึก
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FormInput
              label="ชื่อ–นามสกุล"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              type="text"
              readOnly={!editing}
            />
            <FormInput
              label="อีเมล"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!editing}
            />

            <FormInput
              label="รหัสผ่านใหม่"
              name="password"
              type="password"
              placeholder={editing ? "กรอกรหัสผ่านใหม่" : "••••••••"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              readOnly={!editing}
            />
            <FormInput
              label="ยืนยันรหัสผ่านใหม่"
              name="confirmPassword"
              type="password"
              placeholder={editing ? "ยืนยันรหัสผ่านใหม่" : "••••••••"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              readOnly={!editing}
            />
          </div>

          {!editing ? (
            <div className="mt-4 rounded-3xl border border-white/30 bg-white/20 p-4 text-base text-ink-500 backdrop-blur-lg dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              เปิดโหมดแก้ไขเพื่อปรับข้อมูล
            </div>
          ) : null}

          {editing ? (
            <div className="mt-4">
              <FormInput
                label="รหัสผ่านเดิม (กรอกเมื่อต้องการเปลี่ยนรหัสผ่าน)"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                readOnly={!editing}
              />
            </div>
          ) : null}

          {error ? <div role="alert" className="mt-4 rounded-2xl bg-rose-100/50 p-4 text-base text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}
          {message ? <div role="status" className="mt-4 rounded-2xl bg-moss-100/50 p-4 text-base text-ink-700 dark:bg-moss-900/20 dark:text-slate-200">{message}</div> : null}

          <div className="mt-6 text-base text-ink-500/80 dark:text-slate-300/70">
            สถานะ: <span className="font-medium">{user?.role ?? "ไม่ทราบ"}</span>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
