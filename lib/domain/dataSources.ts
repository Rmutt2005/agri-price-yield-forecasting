import type { DataSource } from "@/lib/domain/types";

export const DATA_SOURCES: readonly DataSource[] = [
  {
    id: "source-moc",
    name: "MOC",
    type: "API",
    priority: 1,
    enabled: false,
    status: "DISABLED",
    metadata: { purpose: "price source adapter contract" },
  },
  {
    id: "source-nabc-oae",
    name: "NABC/OAE",
    type: "API",
    priority: 2,
    enabled: false,
    status: "DISABLED",
    metadata: { purpose: "price source adapter contract" },
  },
  {
    id: "source-talad-thai",
    name: "Talad Thai",
    type: "API",
    priority: 3,
    enabled: false,
    status: "DISABLED",
    metadata: { purpose: "price source adapter contract" },
  },
  {
    id: "source-synthetic",
    name: "Synthetic development source",
    type: "MANUAL_UPLOAD",
    priority: 99,
    enabled: true,
    status: "ACTIVE",
    metadata: { purpose: "development-only" },
  },
];

export function findDataSource(sourceKey: string) {
  return DATA_SOURCES.find(
    (source) => source.id === sourceKey || source.name === sourceKey,
  );
}
