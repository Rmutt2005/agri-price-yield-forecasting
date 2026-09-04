"use client";

import * as React from "react";
import { CheckCircle2, Database, Play, Search, Upload, WandSparkles } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";
import type {
  DataOrigin,
  DatasetValidationReport,
  ModelComparison,
  ModelVersion,
  TrainingDataset,
} from "@/lib/domain/types";
import type { AuthUser } from "@/lib/repositories/authRepository";

type DatasetSummary = Omit<TrainingDataset, "rows">;

const SAMPLE_ROWS = JSON.stringify(
  [
    { areaKey: "AREA_001", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 700, soil_ph: 6.5 },
    { areaKey: "AREA_002", cropKey: "HEAD_LETTUCE", yieldKgPerRai: 760, soil_ph: 6.2 },
    { areaKey: "AREA_003", cropKey: "CABBAGE", yieldKgPerRai: 1280, soil_ph: 5.9 },
  ],
  null,
  2,
);

type ApiMessage = { message?: string; error?: string };

const comparisonLabels: Record<ModelComparison["status"], string> = {
  BETTER: "ดีกว่า active",
  WORSE: "แย่กว่า active",
  INCONCLUSIVE: "สรุปไม่ได้",
};

export default function OfficerPage() {
  const [datasetName, setDatasetName] = React.useState("Synthetic yield dataset");
  const [rowsText, setRowsText] = React.useState(SAMPLE_ROWS);
  const [mappingText, setMappingText] = React.useState("{}");
  const [dataOrigin, setDataOrigin] = React.useState<DataOrigin>("SYNTHETIC");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [datasets, setDatasets] = React.useState<DatasetSummary[]>([]);
  const [models, setModels] = React.useState<ModelVersion[]>([]);
  const [comparisons, setComparisons] = React.useState<Record<string, ModelComparison>>({});
  const [users, setUsers] = React.useState<AuthUser[]>([]);
  const [userQuery, setUserQuery] = React.useState("");
  const [report, setReport] = React.useState<DatasetValidationReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const loadData = React.useCallback(async () => {
    const [datasetsResponse, modelsResponse] = await Promise.all([
      fetch("/api/datasets"),
      fetch("/api/models"),
    ]);
    const usersResponse = await fetch(`/api/users?q=${encodeURIComponent(userQuery)}`);
    const datasetsPayload = (await datasetsResponse.json()) as
      | { data: DatasetSummary[] }
      | ApiMessage;
    const modelsPayload = (await modelsResponse.json()) as
      | { data: ModelVersion[] }
      | ApiMessage;
    const usersPayload = (await usersResponse.json()) as
      | { data: AuthUser[] }
      | ApiMessage;
    if (!datasetsResponse.ok) {
      throw new Error((datasetsPayload as ApiMessage).message ?? "โหลด dataset ไม่สำเร็จ");
    }
    if (!modelsResponse.ok) {
      throw new Error((modelsPayload as ApiMessage).message ?? "โหลด model ไม่สำเร็จ");
    }
    if (!usersResponse.ok) {
      throw new Error((usersPayload as ApiMessage).message ?? "ค้นหาผู้ใช้ไม่สำเร็จ");
    }
    setDatasets((datasetsPayload as { data: DatasetSummary[] }).data);
    const modelData = modelsPayload as { data: ModelVersion[]; comparisons?: ModelComparison[] };
    setModels(modelData.data);
    setComparisons(Object.fromEntries(
      (modelData.comparisons ?? []).map((comparison) => [comparison.candidateModelId, comparison]),
    ));
    setUsers((usersPayload as { data: AuthUser[] }).data);
  }, [userQuery]);

  React.useEffect(() => {
    void loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [loadData]);

  async function uploadDataset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    setMessage("");
    try {
      let mapping: unknown;
      try {
        mapping = mappingText.trim() ? JSON.parse(mappingText) : undefined;
      } catch {
        throw new Error("column mapping ต้องเป็น JSON ที่ถูกต้อง");
      }
      const request = selectedFile
        ? (() => {
            const form = new FormData();
            form.append("name", datasetName);
            form.append("dataOrigin", dataOrigin);
            form.append("file", selectedFile);
            if (mapping !== undefined) form.append("columnMapping", JSON.stringify(mapping));
            return { body: form };
          })()
        : (() => {
            const rows = JSON.parse(rowsText) as unknown;
            if (!Array.isArray(rows)) throw new Error("ข้อมูลต้องเป็น JSON array");
            return {
              body: JSON.stringify({ name: datasetName, dataOrigin, rows, columnMapping: mapping }),
              headers: { "Content-Type": "application/json" },
            };
          })();
      const response = await fetch("/api/datasets", { method: "POST", ...request });
      const payload = (await response.json()) as {
        dataset?: DatasetSummary;
        message?: string;
      };
      if (!response.ok || !payload.dataset) throw new Error(payload.message ?? "upload ไม่สำเร็จ");
      setReport(payload.dataset.report);
      setMessage("สร้าง dataset version และ validation report แล้ว");
      await loadData();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "upload ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  async function toggleUserStatus(user: AuthUser) {
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
      const payload = (await response.json()) as ApiMessage;
      if (!response.ok) throw new Error(payload.message ?? "เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ");
      setMessage(`${nextActive ? "เปิด" : "ปิด"}บัญชีผู้ใช้แล้ว`);
      await loadData();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  async function trainDataset(id: string) {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/datasets/${id}/train`, { method: "POST" });
      const payload = (await response.json()) as { model?: ModelVersion; message?: string };
      if (!response.ok || !payload.model) throw new Error(payload.message ?? "training ไม่สำเร็จ");
      setMessage(`สร้าง candidate ${payload.model.version} แล้ว`);
      await loadData();
    } catch (trainError) {
      setError(trainError instanceof Error ? trainError.message : "training ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  async function activateModel(id: string) {
    const comparison = comparisons[id];
    const comparisonMessage = comparison?.status === "WORSE"
      ? " ผล metrics แย่กว่า active model"
      : comparison?.status === "BETTER"
        ? " ผล metrics ดีกว่า active model"
        : " ยังสรุปเทียบกับ active model ไม่ได้";
    if (!window.confirm(`ยืนยัน activate candidate model นี้หรือไม่?${comparisonMessage}`)) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/models/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json()) as { model?: ModelVersion; message?: string };
      if (!response.ok || !payload.model) throw new Error(payload.message ?? "activate ไม่สำเร็จ");
      setMessage(`activate ${payload.model.version} แล้ว`);
      await loadData();
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "activate ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  async function rollbackModel(id: string) {
    if (!window.confirm("ยืนยัน rollback ไปยัง model นี้หรือไม่?")) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/models/${id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json()) as { model?: ModelVersion; message?: string };
      if (!response.ok || !payload.model) throw new Error(payload.message ?? "rollback ไม่สำเร็จ");
      setMessage(`rollback ไป ${payload.model.version} แล้ว`);
      await loadData();
    } catch (rollbackError) {
      setError(rollbackError instanceof Error ? rollbackError.message : "rollback ไม่สำเร็จ");
    } finally {
      setWorking(false);
    }
  }

  function searchUsers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    void loadData()
      .catch((searchError) => setError(searchError instanceof Error ? searchError.message : "ค้นหาผู้ใช้ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }

  return (
    <DashboardShell title="Officer · Dataset และ Model">
      <div className="grid gap-4">
        {error ? <div role="alert" className="rounded-2xl bg-rose-100/50 p-4 text-base text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}
        {message ? <div role="status" className="rounded-2xl bg-white/25 p-4 text-base text-ink-700 dark:bg-white/10 dark:text-slate-200">{message}</div> : null}

        <Card className="p-6">
          <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
            <Upload className="h-4 w-4 text-moss-600 dark:text-moss-400" />
            Upload และตรวจ dataset
          </div>
          <p className="mt-1 text-sm text-ink-500 dark:text-slate-300">
            รองรับ JSON array และไฟล์ CSV/JSON สูงสุด 2 MB; ทุกแถวต้องผ่าน catalog และ Factor Registry ก่อน train
          </p>
          <form className="mt-4 grid gap-4" onSubmit={uploadDataset}>
            <FormInput
              label="ชื่อ dataset"
              name="datasetName"
              value={datasetName}
              disabled={working}
              onChange={(event) => setDatasetName(event.target.value)}
            />
            <FormInput
              label="Data origin"
              name="dataOrigin"
              as="select"
              value={dataOrigin}
              disabled={working}
              onChange={(event) => setDataOrigin(event.target.value as DataOrigin)}
            >
              <option value="SYNTHETIC">SYNTHETIC · development</option>
              <option value="ACTUAL">ACTUAL · imported source</option>
              <option value="IMPUTED">IMPUTED · completed values</option>
            </FormInput>
            <label className="grid gap-1.5">
              <span className="text-base font-medium text-ink-700 dark:text-slate-200">ไฟล์ dataset (optional)</span>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                disabled={working}
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-2xl border border-white/40 bg-white/20 px-4 py-3 text-sm text-ink-900 backdrop-blur-2xl file:mr-3 file:rounded-xl file:border-0 file:bg-moss-600 file:px-3 file:py-2 file:font-medium file:text-white dark:border-white/20 dark:bg-white/5 dark:text-slate-100"
              />
              {selectedFile ? <span className="text-xs text-ink-500 dark:text-slate-300">เลือกไฟล์: {selectedFile.name}</span> : null}
            </label>
            <label className="grid gap-1.5">
              <span className="text-base font-medium text-ink-700 dark:text-slate-200">Rows (JSON)</span>
              <textarea
                name="rows"
                value={rowsText}
                disabled={working}
                onChange={(event) => setRowsText(event.target.value)}
                className="min-h-52 w-full rounded-2xl border border-white/40 bg-white/20 px-4 py-3 font-mono text-sm text-ink-900 outline-none backdrop-blur-2xl focus:border-moss-400/60 focus:ring-2 focus:ring-moss-400/25 dark:border-white/20 dark:bg-white/5 dark:text-slate-100"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-base font-medium text-ink-700 dark:text-slate-200">Column mapping (JSON, optional)</span>
              <textarea
                name="columnMapping"
                value={mappingText}
                disabled={working}
                onChange={(event) => setMappingText(event.target.value)}
                placeholder={'{"area":"areaKey","crop":"cropKey","yield":"yieldKgPerRai"}'}
                className="min-h-24 w-full rounded-2xl border border-white/40 bg-white/20 px-4 py-3 font-mono text-sm text-ink-900 outline-none backdrop-blur-2xl focus:border-moss-400/60 focus:ring-2 focus:ring-moss-400/25 dark:border-white/20 dark:bg-white/5 dark:text-slate-100"
              />
            </label>
            <Button type="submit" disabled={working} leftIcon={<Database className="h-4 w-4" />}>
              {working ? "กำลังประมวลผล..." : "Upload และ validate"}
            </Button>
          </form>
          {report ? (
            <div className="mt-4 rounded-2xl border border-white/30 bg-white/15 p-4 text-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 font-semibold text-ink-900 dark:text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-moss-600 dark:text-moss-400" />
                Validation report: {report.valid ? "ผ่าน" : "มีข้อผิดพลาด"}
              </div>
              <div className="mt-2 text-ink-500 dark:text-slate-300">
                {report.validRowCount}/{report.rowCount} แถวผ่าน · features: {report.featureColumns.join(", ") || "ไม่มี"}
              </div>
              {report.issues.length ? (
                <ul className="mt-2 list-disc pl-5 text-rose-700 dark:text-rose-200">
                  {report.issues.slice(0, 5).map((issue) => (
                    <li key={`${issue.row}-${issue.field}`}>แถว {issue.row}: {issue.field} — {issue.message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
            <Search className="h-4 w-4 text-moss-600 dark:text-moss-400" />
            ค้นหาผู้ใช้งาน
          </div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={searchUsers}>
            <div className="min-w-0 flex-1">
              <FormInput
                label="ชื่อหรืออีเมล"
                name="userQuery"
                value={userQuery}
                disabled={working}
                placeholder="ค้นหา..."
                onChange={(event) => setUserQuery(event.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={working} leftIcon={<Search className="h-4 w-4" />}>
              ค้นหา
            </Button>
          </form>
          <div className="mt-4 grid gap-2">
            {loading ? <div className="text-sm text-ink-500 dark:text-slate-300">กำลังค้นหา...</div> : null}
            {!loading && users.length === 0 ? <div className="text-sm text-ink-500 dark:text-slate-300">ไม่พบผู้ใช้</div> : null}
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-1 rounded-2xl border border-white/30 bg-white/15 p-3 text-sm dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-ink-900 dark:text-slate-100">{user.fullName}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ink-500 dark:text-slate-300">{user.email} · {user.role}</span>
                  {user.role === "USER" ? (
                    <Button type="button" variant="secondary" disabled={working} onClick={() => toggleUserStatus(user)}>
                      {user.active ? "ปิดบัญชี" : "เปิดบัญชี"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
            <WandSparkles className="h-4 w-4 text-moss-600 dark:text-moss-400" />
            Dataset versions
          </div>
          <div className="mt-4 grid gap-3">
            {loading ? <div className="text-sm text-ink-500 dark:text-slate-300">กำลังโหลด...</div> : null}
            {!loading && datasets.length === 0 ? <div className="text-sm text-ink-500 dark:text-slate-300">ยังไม่มี dataset</div> : null}
            {datasets.map((dataset) => (
              <div key={dataset.id} className="flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/15 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
                <div>
                  <div className="font-medium text-ink-900 dark:text-slate-100">{dataset.name} · {dataset.version}</div>
                  <div className="text-sm text-ink-500 dark:text-slate-300">{dataset.status} · {dataset.report.validRowCount}/{dataset.report.rowCount} valid rows</div>
                </div>
                <Button type="button" variant="secondary" disabled={working || !dataset.report.valid} onClick={() => trainDataset(dataset.id)} leftIcon={<Play className="h-4 w-4" />}>
                  Train candidate
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
            <WandSparkles className="h-4 w-4 text-moss-600 dark:text-moss-400" />
            Model registry
          </div>
          <div className="mt-4 grid gap-3">
            {models.map((model) => (
              <div key={model.id} className="flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/15 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
                <div>
                  <div className="font-medium text-ink-900 dark:text-slate-100">{model.modelType} · {model.version}</div>
                  <div className="text-sm text-ink-500 dark:text-slate-300">{model.status} · {model.target}</div>
                  <div className="text-sm text-ink-500 dark:text-slate-300">MAE {model.metrics.MAE ?? "—"} · RMSE {model.metrics.RMSE ?? "—"} · R² {model.metrics.R2 ?? "—"}</div>
                  {model.status === "CANDIDATE" && comparisons[model.id] ? (
                    <div className={`mt-1 text-sm ${comparisons[model.id].status === "WORSE" ? "text-rose-700 dark:text-rose-200" : "text-moss-700 dark:text-moss-300"}`}>
                      เทียบ active: {comparisonLabels[comparisons[model.id].status]}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {model.status === "CANDIDATE" ? <Button type="button" disabled={working} onClick={() => activateModel(model.id)}>Activate</Button> : null}
                  {model.status === "ARCHIVED" ? <Button type="button" variant="secondary" disabled={working} onClick={() => rollbackModel(model.id)}>Rollback</Button> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
