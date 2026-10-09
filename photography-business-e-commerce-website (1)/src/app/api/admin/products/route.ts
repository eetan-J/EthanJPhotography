import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { getCategories } from "@/lib/categories";

const shippingClasses = ["standard", "oversized", "digital", "free"];
const isImage = (v: string) => /^https?:\/\//i.test(v) || v.startsWith("/api/media/");

function toCents(value: unknown) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

async function parseProduct(input: Record<string, unknown>) {
  const categories = await getCategories();
  const name = String(input.name || "").trim().slice(0, 120);
  const category = String(input.category || "");
  if (!name) throw new Error("Give the piece a name.");
  if (!categories.includes(category)) throw new Error("Choose a category.");

  const rawImages = Array.isArray(input.images) ? input.images : [];
  const images = rawImages.map(v => String(v).trim()).filter(isImage).slice(0, 8);
  if (!images.length) throw new Error("Add at least one image.");

  const price = toCents(input.price);
  if (!Number.isSafeInteger(price) || price < 100) throw new Error("Set a base price of at least $1.");

  const rawSizes = Array.isArray(input.sizes) ? input.sizes : [];
  const sizeOptions: { label: string; price: number }[] = [];
  for (const entry of rawSizes) {
    const row = entry as Record<string, unknown>;
    const label = String(row?.label ?? "").trim().slice(0, 24);
    if (!label) continue;
    const cents = toCents(row?.price);
    if (!Number.isSafeInteger(cents) || cents < 100) throw new Error(`Set a price of at least $1 for the “${label}” size.`);
    sizeOptions.push({ label, price: cents });
  }
  if (sizeOptions.length > 8) throw new Error("Up to 8 sizes per product.");

  const rawDetails = Array.isArray(input.details) ? input.details : [];
  const details = rawDetails.map(v => String(v).trim().slice(0, 160)).filter(Boolean).slice(0, 12);

  const rawFinishes = Array.isArray(input.finishes) ? input.finishes : [];
  const finishOptions = rawFinishes.map(v => String(v).trim().slice(0, 40)).filter(Boolean).slice(0, 10);

  const shippingClass = shippingClasses.includes(String(input.shippingClass)) ? String(input.shippingClass) : "standard";
  const rawExcludes = Array.isArray(input.shippingExcludes) ? input.shippingExcludes : [];
  const shippingExcludes = [...new Set(rawExcludes.map(v => String(v).trim().slice(0, 40)).filter(Boolean))];
  const inventoryRaw = input.inventory;
  const inventory = inventoryRaw === "" || inventoryRaw === null || inventoryRaw === undefined ? null : Math.max(0, Math.floor(Number(inventoryRaw) || 0));

  return {
    name, category, imageUrl: images[0], images,
    price, sizeOptions: sizeOptions.length ? sizeOptions : null,
    finishOptions: finishOptions.length ? finishOptions : null,
    details: details.length ? details : null,
    shippingClass, shippingExcludes: shippingExcludes.length ? shippingExcludes : null, inventory,
    location: String(input.location || "").slice(0, 120),
    description: String(input.description || "").slice(0, 2000),
    featured: Boolean(input.featured),
    active: input.active !== false,
  };
}

const slugify = (name: string) => `${name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;

export async function GET(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await db.select().from(products).orderBy(desc(products.createdAt)));
}

export async function POST(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await parseProduct(await req.json());
    const [item] = await db.insert(products).values({ ...data, slug: slugify(data.name) }).returning();
    return NextResponse.json(item);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid product" }, { status: 400 }); }
}

export async function PATCH(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = await req.json();
    const data = await parseProduct(input);
    const [item] = await db.update(products).set(data).where(eq(products.id, String(input.id))).returning();
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid product" }, { status: 400 }); }
}

export async function DELETE(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(products).where(eq(products.id, String(id)));
  return NextResponse.json({ ok: true });
}