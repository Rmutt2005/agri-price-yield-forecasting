# Data Contracts

## Shared Enums

```ts
type DataOrigin = "ACTUAL" | "IMPUTED" | "SYNTHETIC";
type UserRole = "USER" | "OFFICER" | "ADMIN";
type RiskLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
type PriceType = "WHOLESALE" | "RETAIL" | "FARM_GATE" | "OTHER";
type ModelStatus = "TRAINING" | "CANDIDATE" | "ACTIVE" | "ARCHIVED" | "FAILED";
type DatasetStatus = "UPLOADED" | "VALIDATED" | "TRAINING" | "TRAINED" | "FAILED";
```

```ts
type CropVariety = {
  id: string;
  cropKey: string;
  key: string;
  name: string;
  growingDaysOverride?: number;
  dataOrigin: DataOrigin;
  active: boolean;
};
```

## Canonical Input

```ts
type AnalysisInput = {
  areaKey: string;
  cropKey: string;
  varietyKey?: string;
  plantingDate: string; // YYYY-MM-DD
  areaRai: number; // rai, > 0
  growingDaysOverride?: number;
  factors?: Record<string, number | string | boolean>;
  costsPerRai: {
    fertilizerThb?: number;
    chemicalThb?: number;
    laborThb?: number;
    otherThb?: number;
  };
};
```

`costsPerRai` is the user-facing input unit. The application service normalizes it to total THB by multiplying each component by `areaRai`; API responses expose total economics in THB.

## Canonical Analysis Response

```ts
type AnalysisResponse = {
  analysisId: string;
  expectedHarvestDate: string;
  yield: {
    kgPerRai: number;
    totalKg: number;
    unit: "kg/rai";
    modelVersion: string;
  };
  price: {
    thbPerKg: number;
    currency: "THB";
    unit: "kg";
    priceType: "WHOLESALE" | "RETAIL" | "FARM_GATE" | "OTHER";
    modelVersion: string;
  };
  diseaseRisk: {
    score: number;
    level: RiskLevel;
    ruleVersion: string;
  };
  economics: {
    expectedRevenueThb: number;
    totalCostThb: number;
    expectedProfitThb: number;
    breakEvenPriceThbPerKg: number;
    breakEvenYieldKg: number;
    profitPerRaiThb: number;
  };
  inputFeatureSchema: string[];
  dataQuality: {
    origin: DataOrigin;
    warnings: string[];
    stale: boolean;
  };
  predictionTimestamp: string;
};
```

## Observation Contracts

Factor observations use area/cultivation scope, factor key, observed timestamp, typed scalar value, canonical unit, source ID and data origin. Price records use `cropId`, date, price, `currency = THB`, `unit = kg`, price type, market, source ID and data origin. Weather records use area, date, raw daily weather fields, source ID and data origin. Yield records use area/crop, harvest date, `yieldKgPerRai`, source ID and data origin. A normalized adapter must reject invalid units/types before persistence, and repository adapters deduplicate supported natural keys.

## Model Version Contract

```ts
type ModelVersion = {
  modelId: string;
  version: string;
  modelType: "YIELD" | "PRICE" | "DISEASE";
  target: string;
  featureSchema: string[];
  trainingDatasetId?: string;
  trainingTimestamp: string;
  metrics: Record<string, number>;
  status: ModelStatus;
  artifactLocation?: string;
  artifactChecksum?: string;
  parameters?: Record<string, number>;
};
```

## Dataset Upload Contract

Development accepts either a JSON object (`name`, `dataOrigin`, `rows`, optional `columnMapping`) or multipart form data containing a `.csv`/`.json` file and the same fields. Files/bodies are limited to 2 MB and datasets to 10,000 rows. The parser emits scalar values only; validation rejects unknown columns unless they map to an active Factor Registry key. The raw upload is recorded through `ArtifactStore`, whose default is in-memory and whose local-filesystem provider is selected explicitly.

## User Status Contract

`PATCH /api/users/:id` accepts `{ "active": boolean }`. Officer may update only general `USER` accounts; Admin may update any account except self-deactivation. Deactivation revokes active sessions for that account.

## Contract Rules

- API boundaries use explicit schemas and return structured validation errors; no `any` passthrough from uploaded data.
- Dates are ISO strings; numeric inputs must be finite and range-validated.
- Display labels in Thai are presentation concerns; keys/enums remain stable English identifiers.
- Synthetic responses must expose their origin; actual responses must retain source metadata.
- A trained development baseline stores learned parameters separately from its immutable feature schema so activation changes the prediction adapter, not only the displayed version.
