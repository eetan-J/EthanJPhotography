import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, orders } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Stripe from "stripe";
import { getSettings, ratesForOrder } from "@/lib/settings";
import { countryName } from "@/lib/countries";
import { DIGITAL_CATEGORIES } from "@/lib/categories";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Checkout is not configured yet. Please contact Ethan to place an order." }, { status: 503 });
  try {
    const input = await req.json();
    const cart = Array.isArray(input.items) ? input.items : [];
    if (!cart.length || cart.length > 30) return NextResponse.json({ error: "Your bag is empty or too large." }, { status: 400 });
    const lines = new Map<string, { size: string; option: string; quantity: number }>();
    for (const raw of cart) {
      const id = String(raw.id || ""); const quantity = Number(raw.quantity);
      const size = String(raw.size || "").slice(0, 30); const option = String(raw.option || "").slice(0, 30);
      if (!/^[a-f0-9-]{36}$/i.test(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return NextResponse.json({ error: "Invalid bag item." }, { status: 400 });
      const existing = lines.get(id);
      if (existing) { if (existing.size !== size || existing.option !== option) return NextResponse.json({ error: "Your bag has conflicting options for one item. Please remove it and add it back." }, { status: 400 }); existing.quantity += quantity; }
      else lines.set(id, { size, option, quantity });
    }
    const found = await db.select().from(products).where(inArray(products.id, [...lines.keys()]));
    if (found.length !== lines.size) return NextResponse.json({ error: "An item in your bag is no longer available." }, { status: 400 });
    const items = found.map(p => {
      const line = lines.get(p.id)!;
      const sizeOption = p.sizeOptions?.find(o => o.label === line.size);
      const unitPrice = p.sizeOptions?.length ? sizeOption?.price ?? p.price : p.price;
      return { productId: p.id, name: p.name, size: sizeOption?.label ?? "", option: line.option, quantity: line.quantity, price: unitPrice, imageUrl: p.imageUrl };
    });
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const physical = found.some(p => p.shippingClass !== "digital" && !DIGITAL_CATEGORIES.includes(p.category));
    const settings = await getSettings();
    const allFreeShipping = found.every(p => p.shippingClass === "free" || p.shippingClass === "digital");

    // Refuse destinations outside the configured shipping zone before taking any payment.
    if (physical) {
      if (!settings.countries.length) return NextResponse.json({ error: "Shipping isn't set up yet. Please message Ethan to place an order." }, { status: 400 });
      const requested = String(input.country || "").toUpperCase();
      if (requested && !settings.countries.includes(requested)) {
        return NextResponse.json({ error: `Sorry — I can't ship to ${countryName(requested)} just yet. Send me a message and we'll find a way.`, code: "country_not_supported" }, { status: 400 });
      }
    }

    // Products can opt out of specific shipping options (e.g. oversized frames without express).
    const excluded = new Set(found.flatMap(p => p.shippingExcludes || []));
    const offered = ratesForOrder(total, allFreeShipping, settings).filter(rate => !excluded.has(rate.id));
    // Everything opted out? Ship it free rather than leaving checkout with no options.
    const usable = offered.length ? offered : [{ id: "fallback", name: "Standard shipping", price: 0, minDays: 3, maxDays: 7 }];
    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = physical
      ? usable.map(rate => ({
          shipping_rate_data: {
            type: "fixed_amount" as const,
            fixed_amount: { amount: rate.price, currency: "aud" },
            display_name: rate.name,
            delivery_estimate: { minimum: { unit: "business_day" as const, value: Math.max(1, rate.minDays) }, maximum: { unit: "business_day" as const, value: Math.max(1, rate.maxDays) } },
          },
        }))
      : [];
    const [order] = await db.insert(orders).values({ items, total }).returning();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment", customer_creation: "always", billing_address_collection: "auto", allow_promotion_codes: true,
      line_items: items.map(item => ({ price_data: { currency: "aud", unit_amount: item.price, product_data: { name: item.size ? `${item.name} — ${item.size}${item.option ? ` · ${item.option}` : ""}` : item.name, images: /^https:\/\//.test(item.imageUrl) ? [item.imageUrl] : [] } }, quantity: item.quantity })),
      ...(physical ? { shipping_address_collection: { allowed_countries: settings.countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] }, shipping_options: shippingOptions } : {}),
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/#shop`, client_reference_id: order.id, metadata: { orderId: order.id },
    });
    await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id));
    return NextResponse.json({ url: session.url });
  } catch (error) { console.error("Checkout error", error); return NextResponse.json({ error: "Unable to start checkout. Please try again or contact us." }, { status: 500 }); }
}
