import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatThreads, chatMessages } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const threads = await db.select().from(chatThreads).orderBy(desc(chatThreads.updatedAt));
  if (!threads.length) return NextResponse.json([]);
  const all = await db.select().from(chatMessages);
  const byThread = new Map<string, typeof all>();
  for (const m of all) { const list = byThread.get(m.threadId) || []; list.push(m); byThread.set(m.threadId, list); }
  return NextResponse.json(threads.map(t => {
    const list = byThread.get(t.id) || [];
    const last = list[list.length - 1];
    const unread = t.lastReadAt ? list.filter(m => m.sender === "customer" && new Date(m.createdAt) > new Date(t.lastReadAt!)).length : list.filter(m => m.sender === "customer").length;
    return { ...t, lastMessage: last || null, unread };
  }));
}

export async function PATCH(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const [thread] = await db.update(chatThreads).set({ lastReadAt: new Date() }).where(eq(chatThreads.id, String(id))).returning();
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(thread);
}
