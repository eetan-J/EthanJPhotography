import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatThreads, chatMessages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

const topics = ["General", "Custom order", "Order support"];
const emailOk = (v: string) => /^\S+@\S+\.\S+$/.test(v);
const getMessages = async (threadId: string) => db.select().from(chatMessages).where(eq(chatMessages.threadId, threadId)).orderBy(asc(chatMessages.createdAt));

export async function GET(req: Request) {
  const email = String(new URL(req.url).searchParams.get("email") || "").trim().toLowerCase().slice(0, 200);
  if (!emailOk(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.email, email)).limit(1);
  if (!thread) return NextResponse.json({ found: false }, { status: 404 });
  return NextResponse.json({ found: true, thread, messages: await getMessages(thread.id) });
}

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const email = String(input.email || "").trim().toLowerCase().slice(0, 200);
    const name = String(input.name || "").trim().slice(0, 100);
    const topic = topics.includes(input.topic) ? input.topic : "General";
    if (!emailOk(email)) return NextResponse.json({ error: "Please enter a valid email address so I can reply to you." }, { status: 400 });
    const [existing] = await db.select().from(chatThreads).where(eq(chatThreads.email, email)).limit(1);
    if (existing) return NextResponse.json({ thread: existing, messages: await getMessages(existing.id) });
    if (name.length < 2) return NextResponse.json({ error: "Please tell me your name to start the chat." }, { status: 400 });
    const [thread] = await db.insert(chatThreads).values({ name, email, topic }).returning();
    if (topic !== "General") {
      const opener = topic === "Custom order" ? "Hi Ethan! I'd like to talk about a custom order." : "Hi Ethan! I need a hand with an order.";
      await db.insert(chatMessages).values({ threadId: thread.id, sender: "customer", body: opener });
    }
    return NextResponse.json({ thread, messages: await getMessages(thread.id) });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
