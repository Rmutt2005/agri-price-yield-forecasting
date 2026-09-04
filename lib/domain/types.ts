export type ScalarValue = number | string | boolean;

export type DataOrigin = "ACTUAL" | "IMPUTED" | "SYNTHETIC";

export type UserRole = "USER" | "OFFICER" | "ADMIN";

export type SystemMode = "NORMAL" | "MAINTENANCE";

export type SystemStatus = {
  mode: SystemMode;
  message?: string;
  changedBy?: string;
  updatedAt: string;
};

export type RiskLevel =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";

export type FactorCategory =
  | "AREA"
  | "SOIL"
  | "WEATHER"
  | "CROP"
  | "MANAGEMENT"
  | "OTHER";

export type FactorDataType = "NUMBER" | "CATEGORY" | "BOOLEAN" | "TEXT";

export type AggregationMethod =
  | "LAST"
  | "MEAN"
  | "SUM"
  | "MIN"
  | "MAX"
  | "COUNT";

export type PriceType = "WHOLESALE" | "RETAIL" | "FARM_GATE" | "OTHER";

export type ModelType = "YIELD" | "PRICE" | "DISEASE";

export type ModelStatus =
  | "TRAINING"
  | "CANDIDATE"
  | "ACTIVE"
  | "ARCHIVED"
  | "FAILED";

export type DatasetStatus =
  | "UPLOADED"
  | "VALIDATED"
  | "TRAINING"
  | "TRAINED"
  | "FAILED";

export type DataSourceType = "API" | "SCRAPER" | "MANUAL_UPLOAD";

export type DataSourceStatus = "ACTIVE" | "DEGRADED" | "DISABLED" | "ERROR";

export type Crop = {
  id: string;
  key: string;
  name: string;
  defaultGrowingDays: number;
  dataOrigin: DataOrigin;
  active: boolean;
};

export type CropVariety = {
  id: string;
  cropKey: string;
  key: string;
  name: string;
  growingDaysOverride?: number;
  dataOrigin: DataOrigin;
  active: boolean;
};

export type Area = {
  id: string;
  key: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  dataOrigin: DataOrigin;
  active: boolean;
};

export type FactorDefinition = {
  id: string;
  key: string;
  name: string;
  category: FactorCategory;
  dataType: FactorDataType;
  unit?: string;
  description: string;
  aggregationMethod: AggregationMethod;
  active: boolean;
};

export type FactorObservation = {
  id: string;
  areaKey: string;
  cultivationId?: string;
  factorKey: string;
  observedAt: string;
  value: ScalarValue;
  unit?: string;
  sourceId: string;
  dataOrigin: DataOrigin;
  qualityFlags?: string[];
};

export type WeatherSummary = {
  temperatureMinC: number;
  temperatureMaxC: number;
  temperatureAvgC: number;
  rainfallMm: number;
  relativeHumidityPct: number;
  solarRadiation: number;
  windSpeedMps: number;
  dataOrigin: DataOrigin;
};

export type WeatherObservation = WeatherSummary & {
  id: string;
  areaKey: string;
  date: string;
  sourceId: string;
};

export type PriceObservation = {
  id: string;
  cropKey: string;
  date: string;
  price: number;
  currency: "THB";
  unit: "kg";
  priceType: PriceType;
  market?: string;
  sourceId: string;
  dataOrigin: DataOrigin;
};

export type YieldObservation = {
  id: string;
  areaKey: string;
  cropKey: string;
  harvestDate: string;
  yieldKgPerRai: number;
  sourceId: string;
  dataOrigin: DataOrigin;
};

export type DataSource = {
  id: string;
  name: string;
  type: DataSourceType;
  priority: number;
  enabled: boolean;
  status: DataSourceStatus;
  metadata: Record<string, string>;
  lastSuccessAt?: string;
  lastFailureAt?: string;
};

export type ModelVersion = {
  id: string;
  modelKey: string;
  version: string;
  modelType: ModelType;
  target: string;
  featureSchema: string[];
  trainingDatasetId?: string;
  trainingTimestamp: string;
  metrics: Record<string, number>;
  status: ModelStatus;
  artifactLocation?: string;
  artifactChecksum?: string;
  parameters?: Record<string, number>;
  activatedAt?: string;
};

export type ModelComparisonStatus = "BETTER" | "WORSE" | "INCONCLUSIVE";

export type ModelMetricComparison = {
  candidate?: number;
  active?: number;
  delta?: number;
  improves?: boolean;
};

export type ModelComparison = {
  candidateModelId: string;
  activeModelId?: string;
  status: ModelComparisonStatus;
  metrics: Record<string, ModelMetricComparison>;
};

export type DatasetValidationIssue = {
  row: number;
  field: string;
  message: string;
};

export type DatasetValidationReport = {
  valid: boolean;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  detectedColumns: string[];
  featureColumns: string[];
  provenanceCounts: Record<DataOrigin, number>;
  issues: DatasetValidationIssue[];
};

export type TrainingDataset = {
  id: string;
  datasetKey: string;
  version: string;
  name: string;
  uploadedBy: string;
  rows: Array<Record<string, ScalarValue>>;
  report: DatasetValidationReport;
  dataOrigin: DataOrigin;
  status: DatasetStatus;
  createdAt: string;
  sourceFileName?: string;
  artifactLocation?: string;
  artifactChecksum?: string;
};

export type CostBreakdownPerRai = {
  fertilizerThb: number;
  chemicalThb: number;
  laborThb: number;
  otherThb: number;
};

export type AnalysisInput = {
  areaKey: string;
  cropKey: string;
  varietyKey?: string;
  plantingDate: string;
  areaRai: number;
  growingDaysOverride?: number;
  factors?: Record<string, ScalarValue>;
  costsPerRai: CostBreakdownPerRai;
};

export type CultivationStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type CultivationCycle = {
  id: string;
  userId: string;
  input: AnalysisInput;
  status: CultivationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ValidationIssue = {
  field: string;
  message: string;
};

export type PredictionMetadata = {
  modelVersion: string;
  predictionTimestamp: string;
  inputFeatureSchema: string[];
};

export type EconomicsResult = {
  expectedRevenueThb: number;
  totalCostThb: number;
  expectedProfitThb: number;
  breakEvenPriceThbPerKg: number;
  breakEvenYieldKg: number;
  profitPerRaiThb: number;
};

export type AnalysisResponse = {
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
    priceType: PriceType;
    modelVersion: string;
  };
  diseaseRisk: {
    score: number;
    level: RiskLevel;
    ruleVersion: string;
  };
  economics: EconomicsResult;
  inputFeatureSchema: string[];
  dataQuality: {
    origin: DataOrigin;
    warnings: string[];
    stale: boolean;
  };
  predictionTimestamp: string;
};
