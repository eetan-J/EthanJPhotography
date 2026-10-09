import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) { if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json(await db.select().from(orders).orderBy(desc(orders.createdAt))); }
export async function PATCH(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await req.json();
  if (!["unfulfilled", "processing", "shipped", "delivered", "completed"].includes(input.fulfillmentStatus)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const [order] = await db.update(orders).set({ fulfillmentStatus: input.fulfillmentStatus, trackingNumber: String(input.trackingNumber || "").slice(0, 200), notes: String(input.notes || "").slice(0, 1000) }).where(eq(orders.id, String(input.id))).returning();
  return NextResponse.json(order);
}
