"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { ShoppingBag, X, Minus, Plus, ArrowRight, ShieldCheck, Globe, AlertCircle } from "lucide-react";

export type CartItem = { id: string; size: string; option: string; price: number; quantity: number };

export function cartKey(item: Pick<CartItem, "id" | "size" | "option">) { return `${item.id}|${item.size}|${item.option}`; }

export function useBag(products: Product[]) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("ejp_cart") || "[]"); if (Array.isArray(saved)) setCart(saved.filter((i: CartItem) => typeof i?.id === "string" && Number.isInteger(i?.quantity) && i.quantity > 0 && Number.isInteger(i?.price) && typeof i?.size === "string")); } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("ejp_cart", JSON.stringify(cart)); } catch { /* storage blocked — bag just won't persist */ } }, [cart]);
  useEffect(() => { if (open) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; } }, [open]);
  const add = (item: CartItem, max: number | null) => setCart(prev => { const existing = prev.find(i => cartKey(i) === cartKey(item)); if (existing) return prev.map(i => cartKey(i) === cartKey(item) ? { ...i, quantity: Math.min(max ?? 20, i.quantity + 1) } : i); return [...prev, item]; });
  const setQty = (key: string, qty: number, max: number | null) => setCart(prev => prev.map(i => cartKey(i) === key ? { ...i, quantity: Math.min(max ?? 20, qty) } : i).filter(i => i.quantity > 0));
  const remove = (key: string) => setCart(prev => prev.filter(i => cartKey(i) !== key));
  return { cart, open, setOpen, add, setQty, remove };
}

export default function Bag({ products }: { products: Product[] }) {
  const { cart, open, setOpen, setQty, remove } = useBag(products);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [shipping, setShipping] = useState<{ countries: { code: string; name: string }[]; freeShippingThreshold: number; rates: { name: string; price: number }[] } | null>(null);
  const [country, setCountry] = useState("");

  useEffect(() => { fetch("/api/shipping").then(r => r.json()).then(setShipping).catch(() => {}); }, []);
  useEffect(() => { const saved = localStorage.getItem("ejp_ship_country"); if (saved) setCountry(saved); }, []);
  useEffect(() => { if (country) localStorage.setItem("ejp_ship_country", country); }, [country]);
  const lines = cart.map(i => ({ ...i, product: products.find(p => p.id === i.id) })).filter(i => i.product) as { id: string; size: string; option: string; price: number; quantity: number; product: Product }[];
  const count = lines.reduce((s, i) => s + i.quantity, 0);
  const subtotal = lines.reduce((s, i) => s + i.price * i.quantity, 0);

  const digitalOnly = lines.length > 0 && lines.every(l => l.product.shippingClass === "digital" || ["Wallpapers", "Presets"].includes(l.product.category));
  const needsCountry = !digitalOnly && Boolean(shipping);
  const countryOk = !needsCountry || (country !== "" && shipping!.countries.some(c => c.code === country));
  const freeQualified = Boolean(shipping && shipping.freeShippingThreshold > 0 && subtotal >= shipping.freeShippingThreshold);
  const cheapest = shipping?.rates.length ? Math.min(...shipping.rates.map(r => r.price)) : 0;
  const shipEstimate = digitalOnly ? 0 : freeQualified ? 0 : cheapest;

  async function checkout() {
    setLoading(true); setNotice("");
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country, items: lines.map(({ id, size, option, quantity }) => ({ id, size, option, quantity })) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout unavailable");
      window.location.href = data.url;
    } catch (err) { setNotice(err instanceof Error ? err.message : "Something went wrong."); setLoading(false); }
  }

  return <>
    <button className="bag-button" onClick={() => setOpen(true)} aria-label={`Open bag with ${count} items`}><ShoppingBag size={19} strokeWidth={1.6}/><span>Bag ({count})</span></button>
    {open && <div className="drawer-backdrop" onMouseDown={() => setOpen(false)}><aside className="cart-drawer" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div className="drawer-header"><div><span className="eyebrow">YOUR SELECTION</span><h2>Your bag <em>({count})</em></h2></div><button onClick={() => setOpen(false)} aria-label="Close bag"><X size={23}/></button></div>
      <div className="drawer-content">
        {lines.length === 0 ? <div className="cart-empty"><ShoppingBag size={40} strokeWidth={1}/><h3>Nothing in here yet.</h3><p>There's a whole world waiting to be discovered.</p><Link className="dark-button" href="/#shop">Explore the collection <ArrowRight size={17}/></Link></div>
          : lines.map(line => { const key = cartKey(line); return <div className="cart-line" key={key}><img src={line.product.imageUrl} alt={line.product.name}/><div><span className="cart-line-category">{line.product.category}</span><h3>{line.product.name}</h3>{(line.size || line.option) && <span className="cart-line-size">{[line.size, line.option].filter(Boolean).join(" · ")}</span>}<span className="cart-line-price">{formatPrice(line.price)}</span><div className="qty-control"><button onClick={() => setQty(key, line.quantity - 1, line.product.inventory)} aria-label={`Remove one ${line.product.name}`}><Minus size={13}/></button><span>{line.quantity}</span><button onClick={() => setQty(key, line.quantity + 1, line.product.inventory)} disabled={line.quantity >= (line.product.inventory ?? 20)} aria-label={`Add one ${line.product.name}`}><Plus size={13}/></button></div><button className="cart-remove" onClick={() => remove(key)}>Remove</button></div></div>; })}
      </div>
      {lines.length > 0 && <div className="drawer-footer"><div className="subtotal-line"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
      {needsCountry && <div className="bag-ship"><label className="bag-ship-label"><Globe size={14}/> Ship to</label><select value={country} onChange={e => { setCountry(e.target.value); setNotice(""); }}><option value="">Choose your country…</option>{shipping!.countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}<option value="__other">My country isn&apos;t listed</option></select></div>}
      {country === "__other" && <div className="bag-blocked"><AlertCircle size={15}/><div><strong>I don&apos;t ship there yet.</strong><span>Send me a message and we&apos;ll work something out for you.</span><button onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("ejp:open-chat", { detail: { topic: "Custom order" } })); }}>Message Ethan →</button></div></div>}
      {digitalOnly ? <p>Digital delivery — no shipping needed. Taxes calculated at checkout.</p>
        : <p>{freeQualified ? "Your order qualifies for free shipping. " : shipping && shipping.freeShippingThreshold > 0 ? `Free shipping over ${formatPrice(shipping.freeShippingThreshold)}. ` : ""}{shipEstimate > 0 ? `Shipping from ${formatPrice(shipEstimate)}. ` : ""}Taxes calculated at checkout.</p>}
      {notice && <p className="form-error">{notice}</p>}<button className="dark-button checkout-button" onClick={checkout} disabled={loading || !countryOk}>{loading ? "Taking you to checkout..." : !countryOk ? (country === "__other" ? "Not available in your country" : "Choose your country") : "Secure checkout"} <ArrowRight size={18}/></button><div className="stripe-note"><ShieldCheck size={15}/> Secure payments powered by Stripe</div></div>}
    </aside></div>}
  </>;
}
