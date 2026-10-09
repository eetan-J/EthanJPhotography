import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getSettings());
}

export async function PATCH(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await saveSettings(await req.json())); }
  catch { return NextResponse.json({ error: "Could not save settings." }, { status: 400 }); }
}