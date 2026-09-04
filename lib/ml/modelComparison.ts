import type {
  ModelComparison,
  ModelMetricComparison,
  ModelVersion,
} from "@/lib/domain/types";

const LOWER_IS_BETTER = new Set(["MAE", "RMSE"]);
const HIGHER_IS_BETTER = new Set(["R2"]);

function finiteMetric(metrics: Record<string, number>, key: string) {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function compareMetric(
  key: string,
  candidate: number | undefined,
  active: number | undefined,
): ModelMetricComparison {
  if (candidate === undefined || active === undefined) {
    return { candidate, active };
  }
  const delta = Math.round((candidate - active) * 10_000) / 10_000;
  const improves = LOWER_IS_BETTER.has(key)
    ? candidate < active
    : HIGHER_IS_BETTER.has(key)
      ? candidate > active
      : undefined;
  return { candidate, active, delta, improves };
}

export function compareModelToActive(
  candidate: ModelVersion,
  active?: ModelVersion,
): ModelComparison {
  const keys = [...new Set([
    ...Object.keys(candidate.metrics),
    ...(active ? Object.keys(active.metrics) : []),
  ])].filter((key) => LOWER_IS_BETTER.has(key) || HIGHER_IS_BETTER.has(key));
  const metrics = Object.fromEntries(keys.map((key) => [
    key,
    compareMetric(
      key,
      finiteMetric(candidate.metrics, key),
      active ? finiteMetric(active.metrics, key) : undefined,
    ),
  ]));
  const decisions = Object.values(metrics)
    .map((metric) => metric.improves)
    .filter((value): value is boolean => value !== undefined);
  const status = decisions.length === 0 || !active
    ? "INCONCLUSIVE"
    : decisions.every(Boolean)
      ? "BETTER"
      : decisions.every((value) => !value)
        ? "WORSE"
        : "INCONCLUSIVE";

  return {
    candidateModelId: candidate.id,
    activeModelId: active?.id,
    status,
    metrics,
  };
}
