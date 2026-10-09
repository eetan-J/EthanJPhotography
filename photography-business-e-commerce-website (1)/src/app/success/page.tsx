import Link from "next/link";
import Stripe from "stripe";
import { Check, ArrowLeft, Package, Mail, Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let paid = false; let total = 0; let email = ""; let items: { name: string; quantity: number; amount: number }[] = []; let hasPhysical = false;
  if (session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["line_items"] });
      paid = session.payment_status === "paid"; total = (session.amount_total ?? 0); email = session.customer_details?.email || "";
      items = (session.line_items?.data || []).map(i => ({ name: i.description || "", quantity: i.quantity || 1, amount: i.amount_total || 0 }));
      hasPhysical = Boolean(session.shipping_cost && session.shipping_cost.amount_total !== 0) || Boolean((session as unknown as { shipping_details?: { address?: unknown } }).shipping_details?.address);
    } catch { /* invalid session */ }
  }

  return <main className="success-page">
    <div className="success-inner">
      <Link href="/" className="brand"><span className="brand-name">ethan jeffress<span className="brand-period">.</span></span><span className="brand-sub">PHOTOGRAPHY</span></Link>
      <div className="success-card">
        <div className="success-icon"><Check size={28}/></div>
        <span className="eyebrow">{paid ? "ORDER CONFIRMED" : "ORDER RECEIVED"}</span>
        <h1>{paid ? "Thank you for being here." : "Thank you for your order."}</h1>
        <p>{paid ? "Your payment was successful. You'll receive a confirmation email from Stripe shortly, and your order is on its way to becoming something special." : "Your payment is being confirmed. Please check your email for a receipt, or get in touch if you have any questions."}</p>

        {items.length > 0 && <div className="success-summary"><div className="success-summary-head"><span>YOUR ORDER</span><span>{formatPrice(total)}</span></div>{items.map((item, i) => <div className="success-line" key={i}><span>{item.name}</span><span>×{item.quantity}</span><span>{formatPrice(item.amount)}</span></div>)}</div>}

        <div className="success-next"><div><Package size={18}/><div><strong>{hasPhysical ? "Wrapping your order" : "Preparing your files"}</strong><p>{hasPhysical ? "Printed, checked by hand, and shipped within 3–5 business days." : "Your download link will be in your inbox within minutes."}</p></div></div><div><Mail size={18}/><div><strong>Check your inbox</strong><p>{email ? `A receipt has been sent to ${email}.` : "A receipt has been sent from Stripe."}</p></div></div><div><Truck size={18}/><div><strong>{hasPhysical ? "Tracking & delivery" : "Need help?"}</strong><p>{hasPhysical ? "You'll get a tracking number the moment it ships." : "If your download link hasn't arrived, check spam or get in touch."}</p></div></div></div>

        <Link href="/" className="dark-button success-btn"><ArrowLeft size={16}/> Back to the collection</Link>
      </div>
    </div>
  </main>;
}