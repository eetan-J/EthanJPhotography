import { NextResponse } from "next/server";
import { clearAdminCookie, createSessionToken, isAdminRequest, setAdminCookie, verifyPassword } from "@/lib/auth";

export async function GET(req: Request) {
  return NextResponse.json({ authenticated: await isAdminRequest(req), configured: true, stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) });
}

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!verifyPassword(String(password || ""))) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  const token = createSessionToken();
  await setAdminCookie(token);
  return NextResponse.json({ ok: true, token });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
