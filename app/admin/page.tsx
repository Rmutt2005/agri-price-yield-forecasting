"use client";

import * as React from "react";
import { Activity, AlertTriangle, Settings, ShieldCheck, Users } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";
import type { ModelVersion, SystemStatus, UserRole } from "@/lib/domain/types";
import type { AuthUser } from "@/lib/repositories/authRepository";

const ROLES: readonly UserRole[] = ["USER", "OFFICER", "ADMIN"];

export default function AdminPage() {
  const [users, setUsers] = React.useState<AuthUser[]>([]);
  const [models, setModels] = React.useState<ModelVersion[]>([]);
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function loadData() {
    const [usersResponse, statusResponse, modelsResponse] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/system-status"),
      fetch("/api/models"),
    ]);
    const usersPayload = (await usersResponse.json()) as { data?: AuthUser[]; message?: string };
    const statusPayload = (await statusResponse.json()) as { status?: SystemStatus; message?: string };
    const modelsPayload = (await modelsResponse.json()) as { data?: ModelVersion[]; message?: string };
    if (!usersResponse.ok || !usersPayload.data) throw new Error(usersPayload.message ?? "โหลดผู้ใช้ไม่สำเร็จ");
    if (!statusResponse.ok || !statusPayload.status) throw new Error(statusPayload.message ?? "โหลด system status ไม่สำเร็จ");
    if (!modelsResponse.ok || !modelsPayload.data) throw new Error(modelsPayload.message ?? "โหลด model health ไม่สำเร็จ");
    setUsers(usersPayload.data);
    setSystemStatus(statusPayload.status);
    setModels(modelsPayload.data);
  }

  React.useEffect(() => {
    void loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  async function changeRole(userId: string, role: UserRole) {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "เปลี่ยน role ไม่สำเร็จ");
      setMessage("เปลี่ยน role เรียบร้อย");
      await loadData();
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "เปลี่ยน role ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  async function changeUserStatus(user: AuthUser) {
    const nextActive = !user.active;
    if (!window.confirm(`${nextActive ? "เปิด" : "ปิด"}บัญชี ${user.fullName} หรือไม่?`)) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ");
      setMessage(`${nextActive ? "เปิด" : "ปิด"}บัญชีผู้ใช้แล้ว`);
      await loadData();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  async function toggleMaintenance() {
    if (!systemStatus) return;
    const nextMode = systemStatus.mode === "NORMAL" ? "MAINTENANCE" : "NORMAL";
    if (!window.confirm(`ยืนยันเปลี่ยนระบบเป็น ${nextMode} หรือไม่?`)) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/system-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode, message: nextMode === "MAINTENANCE" ? "กำลังปรับปรุงระบบ" : undefined }),
      });
      const payload = (await response.json()) as { status?: SystemStatus; message?: string };
      if (!response.ok || !payload.status) throw new Error(payload.message ?? "เปลี่ยน system status ไม่สำเร็จ");
      setSystemStatus(payload.status);
      setMessage(`เปลี่ยนระบบเป็น ${nextMode} แล้ว`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "เปลี่ยน system status ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  return (
    <DashboardShell title="Admin · System Management">
      <div className="grid gap-4">
        {error ? <div role="alert" className="rounded-2xl bg-rose-100/50 p-4 text-base text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}
        {message ? <div role="status" className="rounded-2xl bg-white/25 p-4 text-base text-ink-700 dark:bg-white/10 dark:text-slate-200">{message}</div> : null}

        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-moss-600 dark:text-moss-400" />
              <div>
                <div className="font-semibold text-ink-900 dark:text-slate-100">System status</div>
                <div className="text-sm text-ink-500 dark:text-slate-300">กำหนด behavior ฝั่ง backend ระหว่าง maintenance</div>
              </div>
            </div>
            <Button type="button" variant="secondary" disabled={working || loading || !systemStatus} onClick={toggleMaintenance} leftIcon={<AlertTriangle className="h-4 w-4" />}>
              {systemStatus?.mode ?? "กำลังโหลด"}
            </Button>
          </div>
          {systemStatus?.message ? <div className="mt-3 text-sm text-ink-500 dark:text-slate-300">{systemStatus.message}</div> : null}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 font-semibold text-ink-900 dark:text-slate-100">
            <Activity className="h-5 w-5 text-moss-600 dark:text-moss-400" />
            Model / system health
          </div>
          <div className="mt-4 grid gap-2">
            {loading ? <div className="text-sm text-ink-500 dark:text-slate-300">กำลังโหลด...</div> : null}
            {!loading && models.length === 0 ? <div className="text-sm text-ink-500 dark:text-slate-300">ยังไม่มี model</div> : null}
            {models.map((model) => (
              <div key={model.id} className="flex flex-col gap-1 rounded-2xl border border-white/30 bg-white/15 p-3 text-sm dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-ink-900 dark:text-slate-100">{model.modelType} · {model.version}</span>
                <span className="text-ink-500 dark:text-slate-300">{model.status} · {model.artifactLocation ?? "ไม่มี artifact location"}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 font-semibold text-ink-900 dark:text-slate-100">
            <Users className="h-5 w-5 text-moss-600 dark:text-moss-400" />
            User และ role management
          </div>
          <div className="mt-4 grid gap-3">
            {loading ? <div className="text-sm text-ink-500 dark:text-slate-300">กำลังโหลด...</div> : null}
            {!loading && users.length === 0 ? <div className="text-sm text-ink-500 dark:text-slate-300">ยังไม่มีผู้ใช้</div> : null}
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/15 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-moss-600 dark:text-moss-400" />
                  <div>
                    <div className="font-medium text-ink-900 dark:text-slate-100">{user.fullName}</div>
                    <div className="text-sm text-ink-500 dark:text-slate-300">{user.email}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <FormInput
                    label=""
                    name={`role-${user.id}`}
                    as="select"
                    value={user.role}
                    disabled={working || !user.active}
                    onChange={(event) => changeRole(user.id, event.target.value as UserRole)}
                  >
                    {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </FormInput>
                  <Button type="button" variant="secondary" disabled={working} onClick={() => changeUserStatus(user)}>
                    {user.active ? "ปิดบัญชี" : "เปิดบัญชี"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
