import type { RiskLevel } from "@/lib/domain/types";

export const DISEASE_RULE_VERSION = "disease-rules-v1";

export type DiseaseRiskSignals = {
  temperatureAvgC?: number;
  relativeHumidityPct?: number;
  rainfallMm?: number;
  soilMoisturePct?: number;
};

export type DiseaseRiskResult = {
  score: number;
  level: RiskLevel;
  ruleVersion: string;
  inputSummary: DiseaseRiskSignals;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 0.2) return "VERY_LOW";
  if (score < 0.4) return "LOW";
  if (score < 0.6) return "MEDIUM";
  if (score < 0.8) return "HIGH";
  return "VERY_HIGH";
}

function humidityRisk(value: number | undefined) {
  if (value === undefined) return 0.25;
  return clamp01((value - 60) / 35);
}

function rainfallRisk(value: number | undefined) {
  if (value === undefined) return 0.2;
  return clamp01(value / 30);
}

function temperatureRisk(value: number | undefined) {
  if (value === undefined) return 0.2;
  return clamp01(Math.abs(value - 24) / 14);
}

function soilMoistureRisk(value: number | undefined) {
  if (value === undefined) return 0.2;
  return clamp01((value - 45) / 45);
}

export function calculateDiseaseRisk(
  signals: DiseaseRiskSignals,
): DiseaseRiskResult {
  const score = Number(
    clamp01(
      humidityRisk(signals.relativeHumidityPct) * 0.45 +
        rainfallRisk(signals.rainfallMm) * 0.3 +
        temperatureRisk(signals.temperatureAvgC) * 0.15 +
        soilMoistureRisk(signals.soilMoisturePct) * 0.1,
    ).toFixed(3),
  );

  return {
    score,
    level: riskLevelFromScore(score),
    ruleVersion: DISEASE_RULE_VERSION,
    inputSummary: signals,
  };
}
