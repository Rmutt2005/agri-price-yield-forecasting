function parseIsoDate(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return undefined;

  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10) === dateString ? date : undefined;
}

export function isIsoDate(dateString: string) {
  return Boolean(parseIsoDate(dateString));
}

export function calculateExpectedHarvestDate(
  plantingDate: string,
  growingDays: number,
) {
  const date = parseIsoDate(plantingDate);
  if (!date) throw new Error("plantingDate must be a valid ISO date (YYYY-MM-DD)");
  if (!Number.isInteger(growingDays) || growingDays <= 0) {
    throw new Error("growingDays must be a positive integer");
  }

  date.setUTCDate(date.getUTCDate() + growingDays);
  return date.toISOString().slice(0, 10);
}
