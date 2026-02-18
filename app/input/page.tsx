"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, MapPin, Sprout, Wallet } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";

export default function CropInputPage() {
  const router = useRouter();

  const [crop, setCrop] = React.useState("พืชชนิดที่ 1");
  const [area, setArea] = React.useState("พื้นที่ที่ 1");

  return (
    <DashboardShell title="กรอกข้อมูลการเพาะปลูก">
      <Card className="p-6">
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/dashboard");
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid flex items-center content-start gap-4">
              <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
                <Sprout className="h-4 w-4" />
                ข้อมูลแปลงเพาะปลูก
              </div>

              <FormInput
                label="เลือกชนิดพืช"
                name="cropType"
                as="select"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
              >
                {[
                  "พืชชนิดที่ 1",
                  "พืชชนิดที่ 2",
                  "พืชชนิดที่ 3",
                  "พืชชนิดที่ 4",
                  "พืชชนิดที่ 5",
                ].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </FormInput>

              <FormInput
                label="เลือกพื้นที่เพาะปลูก"
                name="area"
                as="select"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                {["พื้นที่ที่ 1", "พื้นที่ที่ 2", "พื้นที่ที่ 3"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </FormInput>

              <FormInput
                label="ขนาดพื้นที่ (ไร่)"
                name="size"
                placeholder="เช่น 10"
              />
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-slate-100">
                <Wallet className="h-4 w-4" />
                ต้นทุนการผลิต
              </div>

              <FormInput
                label="ค่าปุ๋ย (บาท/ไร่)"
                name="fertilizer"
                placeholder="เช่น 16000"
              />
              <FormInput
                label="ค่ายาและสารเคมี (บาท/ไร่)"
                name="chemical"
                placeholder="เช่น 12000"
              />
              <FormInput
                label="ค่าแรงงาน (บาท/ไร่)"
                name="labor"
                placeholder="เช่น 13000"
              />
              <FormInput
                label="ค่าใช้จ่ายอื่น ๆ (บาท/ไร่)"
                name="other"
                placeholder="เช่น 2000"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  leftIcon={<ClipboardList className="h-4 w-4" />}
                >
                  บันทึกข้อมูล
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push("/dashboard")}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
