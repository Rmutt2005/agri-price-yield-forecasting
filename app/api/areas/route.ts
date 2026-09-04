import { NextResponse } from "next/server";

import { catalogRepository } from "@/lib/repositories/catalogRepository";

export async function GET() {
  return NextResponse.json({ data: await catalogRepository.listAreas() });
}
