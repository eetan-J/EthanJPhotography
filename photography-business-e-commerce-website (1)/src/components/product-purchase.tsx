"use client";

import { useEffect, useRef, useState } from "react";
import type { Product, SizeOption } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { useBag } from "./bag";
import { ChevronDown, Check, ArrowRight, ShieldCheck } from "lucide-react";

const digital = ["Wallpapers", "Presets"];

export default function ProductPurchase({ product }: { product: Product }) {
  const { cart, add, setOpen } = useBag([product]);
  const sizes = product.sizeOptions?.length ? product.sizeOptions : null;
  const finishes = product.finishOptions?.length ? product.finishOptions : null;
  const isDigital = digital.includes(product.category);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [finish, setFinish] = useState("");
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected: SizeOption | null = sizes ? sizes[sizeIndex] : null;
  const unitPrice = selected?.price ?? product.price;
  useEffect(() => { setAdded(false); }, [sizeIndex, finish]);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false); }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  function addToBag() {
    const item = { id: product.id, size: selected?.label ?? "", option: finish, price: unitPrice, quantity: 1 };
    add(item, product.inventory);
    setAdded(true);
    setTimeout(() => setOpen(true), 350);
  }

  async function buyNow() {
    setBuying(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: product.id, size: selected?.label ?? "", option: finish, quantity: 1 }] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout unavailable");
      window.location.href = data.url;
    } catch { setBuying(false); }
  }

  return <div className="purchase-box">
    <div className="purchase-price-row"><span>{sizes ? "From" : "Price"}</span><strong>{formatPrice(unitPrice)}</strong></div>

    {sizes && <div className="selector-block"><span className="selector-label">Size</span><div ref={dropdownRef} className={`size-select ${dropdownOpen ? "open" : ""}`}>
      <button type="button" className="size-select-trigger" onClick={() => setDropdownOpen(!dropdownOpen)} aria-haspopup="listbox" aria-expanded={dropdownOpen}>
        <span>{selected?.label}</span>
        <span className="size-price-tag">{formatPrice(selected?.price ?? 0)}</span>
        <ChevronDown size={14} className="size-chevron"/>
      </button>
      <ul className="size-select-menu" role="listbox">{sizes.map((option, i) => <li key={option.label}><button type="button" className={i === sizeIndex ? "active" : ""} onClick={() => { setSizeIndex(i); setDropdownOpen(false); }}><span className="size-option-label">{option.label}</span><span className="size-option-price">{formatPrice(option.price)}</span>{i === sizeIndex && <Check size={14}/>}</button></li>)}</ul>
    </div></div>}

    {finishes && <div className="selector-block"><span className="selector-label">{product.category === "Framed Prints" ? "Frame" : product.category === "Photobooks" ? "Cover" : "Finish"}</span><div className="chips">{finishes.map(f => <button key={f} type="button" className={`chip ${finish === f ? "active" : ""}`} onClick={() => setFinish(f)}>{f}</button>)}</div><small className="selector-hint">Included — no extra cost.</small></div>}

    <div className="purchase-actions">
      <button type="button" className={`dark-button buy-button ${added ? "added" : ""}`} onClick={addToBag} disabled={product.inventory === 0}>
        {product.inventory === 0 ? "Sold out" : added ? <><Check size={17}/> Added</> : <>Add to bag</>}
      </button>
      <button type="button" className="buy-now-button" onClick={buyNow} disabled={product.inventory === 0 || buying}>
        {buying ? "Redirecting…" : "Buy now"}
      </button>
    </div>

    <div className="purchase-trust">
      <span><ShieldCheck size={14}/> Stripe secure</span>
      <span>{isDigital ? "Instant delivery" : "Free 30-day returns"}</span>
      <span>{isDigital ? "Yours to keep" : "Ships in 3–5 days"}</span>
    </div>
  </div>;
}