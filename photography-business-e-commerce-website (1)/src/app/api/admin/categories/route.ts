import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { addCategory, getCategories, getCustomCategories, removeCategory } from "@/lib/categories";
import { BASE_CATEGORIES } from "@/lib/categories";

export async function GET(req: Request) {
  return NextResponse.json({ categories: await getCategories(), custom: await getCustomCategories(), base: BASE_CATEGORIES });
}

export async function POST(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
  try {
    const { name } = await req.json();
    return NextResponse.json({ categories: await addCategory(String(name || "")) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add category." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
  try {
    const { name } = await req.json();
    return NextResponse.json({ categories: await removeCategory(String(name || "")) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove category." }, { status: 400 });
  }
}
