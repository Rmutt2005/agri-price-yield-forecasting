import { NextResponse } from "next/server";

import { catalogRepository } from "@/lib/repositories/catalogRepository";

export async function GET(request: Request) {
  const cropKey = new URL(request.url).searchParams.get("cropKey") ?? undefined;
  return NextResponse.json({ data: await catalogRepository.listVarieties(cropKey) });
}
