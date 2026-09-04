import { describe, expect, it } from "vitest";

import { DatasetFileParseError, parseDatasetFile } from "@/lib/application/datasetParser";

describe("dataset file parser", () => {
  it("parses CSV headers, quoted values, numbers, booleans, and blanks", () => {
    const result = parseDatasetFile(
      "yield.csv",
      `area,crop,yield,soil_type,irrigated
AREA_001,HEAD_LETTUCE,700,"loamy, rich",true
AREA_002,HEAD_LETTUCE,,sandy,false`,
    );

    expect(result.format).toBe("CSV");
    expect(result.rows).toEqual([
      {
        area: "AREA_001",
        crop: "HEAD_LETTUCE",
        yield: 700,
        soil_type: "loamy, rich",
        irrigated: true,
      },
      {
        area: "AREA_002",
        crop: "HEAD_LETTUCE",
        yield: undefined,
        soil_type: "sandy",
        irrigated: false,
      },
    ]);
  });

  it("accepts a JSON array or a JSON object with rows", () => {
    expect(parseDatasetFile("rows.json", "[{\"areaKey\":\"AREA_001\"}]").rows).toHaveLength(1);
    expect(parseDatasetFile("rows.json", "{\"rows\":[{\"areaKey\":\"AREA_001\"}]}").rows).toHaveLength(1);
  });

  it("rejects unsupported and malformed files", () => {
    expect(() => parseDatasetFile("rows.xlsx", "")).toThrowError(DatasetFileParseError);
    expect(() => parseDatasetFile("rows.csv", "area,crop\nAREA_001")).toThrow("จำนวน column");
  });
});
