import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatThreads, chatMessages } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";

export async function POST(req: Request) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = await req.json();
    const threadId = String(input.threadId || ""); const body = String(input.body || "").trim().slice(0, 3000);
    if (!/^[a-f0-9-]{36}$/i.test(threadId) || !body) return NextResponse.json({ error: "Please write a reply first." }, { status: 400 });
    const [message] = await db.insert(chatMessages).values({ threadId, sender: "ethan", body }).returning();
    await db.update(chatThreads).set({ updatedAt: new Date(), lastReadAt: new Date() }).where(eq(chatThreads.id, threadId));
    return NextResponse.json({ message, messages: await db.select().from(chatMessages).where(eq(chatMessages.threadId, threadId)).orderBy(asc(chatMessages.createdAt)) });
  } catch {
    return NextResponse.json({ error: "Reply not sent." }, { status: 500 });
  }
}
