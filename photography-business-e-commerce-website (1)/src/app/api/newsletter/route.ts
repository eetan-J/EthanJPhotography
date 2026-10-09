import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { desc } from "drizzle-orm";
export async function POST(req: Request) { const { email } = await req.json(); if (!/^\S+@\S+\.\S+$/.test(String(email || ""))) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 }); await db.insert(subscribers).values({ email: String(email).trim().toLowerCase().slice(0, 200) }).onConflictDoNothing(); return NextResponse.json({ ok: true }); }
export async function GET(req: Request) { if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json(await db.select().from(subscribers).orderBy(desc(subscribers.createdAt))); }
