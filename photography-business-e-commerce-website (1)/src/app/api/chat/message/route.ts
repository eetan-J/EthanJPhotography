import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatThreads, chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

const topics = ["General", "Custom order", "Order support"];
const uuid = (v: string) => /^[a-f0-9-]{36}$/i.test(v);

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const threadId = String(input.threadId || ""); const body = String(input.body || "").trim().slice(0, 2000);
    if (!uuid(threadId) || !body) return NextResponse.json({ error: "Please type a message first." }, { status: 400 });
    const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, threadId)).limit(1);
    if (!thread) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const [message] = await db.insert(chatMessages).values({ threadId, sender: "customer", body }).returning();
    await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, threadId));
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Message not sent. Please try again." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const input = await req.json();
  const threadId = String(input.threadId || ""); const topic = String(input.topic || "");
  if (!uuid(threadId) || !topics.includes(topic)) return NextResponse.json({ error: "Invalid topic." }, { status: 400 });
  const [thread] = await db.update(chatThreads).set({ topic }).where(eq(chatThreads.id, threadId)).returning();
  return NextResponse.json({ thread });
}
