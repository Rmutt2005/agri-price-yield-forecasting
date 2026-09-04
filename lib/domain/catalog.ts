import type { Area, Crop, CropVariety } from "@/lib/domain/types";

export const AREAS: readonly Area[] = [
  {
    id: "area-001",
    key: "AREA_001",
    name: "พื้นที่ทดลองที่ 1",
    location: "เชียงใหม่",
    latitude: 18.7883,
    longitude: 98.9853,
    elevationM: 310,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
  {
    id: "area-002",
    key: "AREA_002",
    name: "พื้นที่ทดลองที่ 2",
    location: "เชียงราย",
    latitude: 19.9072,
    longitude: 99.8309,
    elevationM: 420,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
  {
    id: "area-003",
    key: "AREA_003",
    name: "พื้นที่ทดลองที่ 3",
    location: "แม่ฮ่องสอน",
    latitude: 19.302,
    longitude: 97.9654,
    elevationM: 610,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
] as const;

export const CROPS: readonly Crop[] = [
  {
    id: "crop-head-lettuce",
    key: "HEAD_LETTUCE",
    name: "ผักกาดหอมห่อ",
    defaultGrowingDays: 45,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
  {
    id: "crop-cabbage",
    key: "CABBAGE",
    name: "กะหล่ำปลี",
    defaultGrowingDays: 75,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
  {
    id: "crop-cos-lettuce",
    key: "COS_LETTUCE",
    name: "ผักกาดหวานคอส",
    defaultGrowingDays: 50,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
  {
    id: "crop-taiwan-baby-bok-choy",
    key: "TAIWAN_BABY_BOK_CHOY",
    name: "เบบี้กวางตุ้งไต้หวัน",
    defaultGrowingDays: 35,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
  {
    id: "crop-japanese-pumpkin",
    key: "JAPANESE_PUMPKIN",
    name: "ฟักทองญี่ปุ่น",
    defaultGrowingDays: 90,
    dataOrigin: "SYNTHETIC",
    active: true,
  },
] as const;

export const CROP_VARIETIES: readonly CropVariety[] = CROPS.map((crop) => ({
  id: `variety-${crop.key.toLowerCase()}`,
  cropKey: crop.key,
  key: `${crop.key}_STANDARD`,
  name: "สายพันธุ์มาตรฐานสำหรับ development",
  dataOrigin: "SYNTHETIC",
  active: true,
}));

export function findArea(areaKey: string) {
  return AREAS.find((area) => area.key === areaKey && area.active);
}

export function findCrop(cropKey: string) {
  return CROPS.find((crop) => crop.key === cropKey && crop.active);
}

export function findCropVariety(varietyKey: string, cropKey?: string) {
  return CROP_VARIETIES.find((variety) =>
    variety.key === varietyKey && variety.active && (!cropKey || variety.cropKey === cropKey),
  );
}
