import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try { event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid" && session.metadata?.orderId) {
        const details = session.customer_details;
        const address = details?.address;
        const shippingAddress = address ? [address.line1, address.line2, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(", ") : "";
        await db.transaction(async (tx) => {
          const [paidOrder] = await tx.update(orders).set({ paymentStatus: "paid", email: details?.email || session.customer_email || "", customerName: details?.name || "", shippingAddress }).where(and(eq(orders.id, session.metadata!.orderId), ne(orders.paymentStatus, "paid"))).returning();
          if (paidOrder) {
            for (const item of paidOrder.items) {
              await tx.update(products).set({ inventory: sql`greatest(0, ${products.inventory} - ${item.quantity})` }).where(and(eq(products.id, item.productId), isNotNull(products.inventory)));
            }
          }
        });
      }
    }
    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.orderId) await db.update(orders).set({ paymentStatus: event.type === "checkout.session.expired" ? "expired" : "failed" }).where(and(eq(orders.id, session.metadata.orderId), ne(orders.paymentStatus, "paid")));
    }
    return NextResponse.json({ received: true });
  } catch (error) { console.error("Webhook processing error", error); return NextResponse.json({ error: "Processing failed" }, { status: 500 }); }
}
