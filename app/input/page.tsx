"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  MapPin,
  Sprout,
  Wallet,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";
import type { AnalysisResponse, Area, Crop, CropVariety } from "@/lib/domain/types";

type ApiError = {
  error?: string;
  message?: string;
  issues?: Array<{ field: string; message: string }>;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function CropInputPage() {
  const router = useRouter();
  const [crops, setCrops] = React.useState<readonly Crop[]>([]);
  const [varieties, setVarieties] = React.useState<readonly CropVariety[]>([]);
  const [areas, setAreas] = React.useState<readonly Area[]>([]);
  const [crop, setCrop] = React.useState("");
  const [variety, setVariety] = React.useState("");
  const [area, setArea] = React.useState("");
  const [plantingDate, setPlantingDate] = React.useState(todayIsoDate);
  const [areaRai, setAreaRai] = React.useState("1");
  const [fertilizer, setFertilizer] = React.useState("1600");
  const [chemical, setChemical] = React.useState("1200");
  const [labor, setLabor] = React.useState("1300");
  const [other, setOther] = React.useState("200");
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const [cropsResponse, areasResponse] = await Promise.all([
          fetch("/api/crops"),
          fetch("/api/areas"),
        ]);
        const varietiesResponse = await fetch("/api/varieties");
        if (!cropsResponse.ok || !areasResponse.ok || !varietiesResponse.ok) {
          throw new Error("โหลด catalog ไม่สำเร็จ");
        }
        const cropsPayload = (await cropsResponse.json()) as { data: Crop[] };
        const areasPayload = (await areasResponse.json()) as { data: Area[] };
        const varietiesPayload = (await varietiesResponse.json()) as { data: CropVariety[] };
        if (cancelled) return;
        setCrops(cropsPayload.data);
        setVarieties(varietiesPayload.data);
        setAreas(areasPayload.data);
        const initialCrop = cropsPayload.data[0]?.key ?? "";
        setCrop(initialCrop);
        setVariety(varietiesPayload.data.find((item) => item.cropKey === initialCrop)?.key ?? "");
        setArea(areasPayload.data[0]?.key ?? "");
      } catch {
        if (!cancelled) setError("ไม่สามารถโหลดรายการพืชและพื้นที่ได้");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const inputPayload = {
        areaKey: area,
        cropKey: crop,
        varietyKey: variety || undefined,
        plantingDate,
        areaRai: Number(areaRai),
        costsPerRai: {
          fertilizerThb: Number(fertilizer || 0),
          chemicalThb: Number(chemical || 0),
          laborThb: Number(labor || 0),
          otherThb: Number(other || 0),
        },
      };
      const cultivationResponse = await fetch("/api/cultivations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputPayload),
      });
      if (!cultivationResponse.ok) {
        const cultivationPayload = (await cultivationResponse.json()) as ApiError;
        throw new Error(cultivationPayload.message ?? "ไม่สามารถบันทึกรอบการเพาะปลูกได้");
      }

      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputPayload),
      });
      const payload = (await response.json()) as AnalysisResponse | ApiError;
      if (!response.ok) {
        const validationMessage =
          "issues" in payload && payload.issues?.length
            ? payload.issues.map((issue) => issue.message).join(" ")
            : undefined;
        throw new Error(
          validationMessage ??
            ("message" in payload ? payload.message : undefined) ??
            "ไม่สามารถสร้างผลวิเคราะห์ได้",
        );
      }

      router.push("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถส่งข้อมูลได้ในขณะนี้",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell title="กรอกข้อมูลการเพาะปลูก">
      <Card className="p-6">
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
              <Sprout className="h-4 w-4" />
              ข้อมูลแปลงเพาะปลูก
            </div>
            <p className="mt-1 text-sm text-ink-500 dark:text-slate-300">
              เลือกข้อมูลจาก catalog กลาง บันทึกรอบการเพาะปลูก และส่งเข้า analysis service
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-rose-300/50 bg-rose-100/40 px-4 py-3 text-base text-rose-800 dark:border-rose-300/20 dark:bg-rose-950/30 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-4">
              <FormInput
                label="เลือกชนิดพืช"
                name="cropType"
                as="select"
                value={crop}
                disabled={catalogLoading || loading}
                onChange={(e) => {
                  const nextCrop = e.target.value;
                  setCrop(nextCrop);
                  setVariety(varieties.find((item) => item.cropKey === nextCrop)?.key ?? "");
                }}
              >
                {crops.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name} ({item.defaultGrowingDays} วัน)
                  </option>
                ))}
              </FormInput>

              <FormInput
                label="เลือกสายพันธุ์ (ถ้ามี)"
                name="variety"
                as="select"
                value={variety}
                disabled={catalogLoading || loading}
                onChange={(e) => setVariety(e.target.value)}
              >
                <option value="">ใช้ค่า growing days ของพืช</option>
                {varieties
                  .filter((item) => item.cropKey === crop)
                  .map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.name}{item.growingDaysOverride ? ` (${item.growingDaysOverride} วัน)` : ""}
                    </option>
                  ))}
              </FormInput>

              <FormInput
                label="เลือกพื้นที่เพาะปลูก"
                name="area"
                as="select"
                value={area}
                disabled={catalogLoading || loading}
                onChange={(e) => setArea(e.target.value)}
              >
                {areas.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name} — {item.location}
                  </option>
                ))}
              </FormInput>

              <FormInput
                label="วันที่ปลูก"
                name="plantingDate"
                type="date"
                value={plantingDate}
                disabled={loading}
                onChange={(e) => setPlantingDate(e.target.value)}
              />

              <FormInput
                label="ขนาดพื้นที่ (ไร่)"
                name="areaRai"
                type="number"
                value={areaRai}
                disabled={loading}
                onChange={(e) => setAreaRai(e.target.value)}
                placeholder="เช่น 10"
              />

              <div className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <MapPin className="h-4 w-4 text-moss-600 dark:text-moss-400" />
                พื้นที่และพืชเป็นข้อมูลสังเคราะห์สำหรับ development
              </div>
            </div>

            <div className="grid content-start gap-4">
              <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
                <Wallet className="h-4 w-4" />
                ต้นทุนการผลิต (บาท/ไร่)
              </div>

              <FormInput
                label="ค่าปุ๋ย"
                name="fertilizer"
                type="number"
                value={fertilizer}
                disabled={loading}
                onChange={(e) => setFertilizer(e.target.value)}
                placeholder="เช่น 1600"
              />
              <FormInput
                label="ค่ายาและสารเคมี"
                name="chemical"
                type="number"
                value={chemical}
                disabled={loading}
                onChange={(e) => setChemical(e.target.value)}
                placeholder="เช่น 1200"
              />
              <FormInput
                label="ค่าแรงงาน"
                name="labor"
                type="number"
                value={labor}
                disabled={loading}
                onChange={(e) => setLabor(e.target.value)}
                placeholder="เช่น 1300"
              />
              <FormInput
                label="ค่าใช้จ่ายอื่น ๆ"
                name="other"
                type="number"
                value={other}
                disabled={loading}
                onChange={(e) => setOther(e.target.value)}
                placeholder="เช่น 200"
              />

              <div className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <CalendarDays className="h-4 w-4 text-moss-600 dark:text-moss-400" />
                ระบบจะคำนวณวันเก็บเกี่ยว ราคา ความเสี่ยง และกำไรให้ในครั้งเดียว
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={catalogLoading || loading || !crop || !area}
              leftIcon={<ClipboardList className="h-4 w-4" />}
            >
              {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์การเพาะปลูก"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => router.push("/dashboard")}
            >
              ยกเลิก
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
