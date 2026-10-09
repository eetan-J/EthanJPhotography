"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Product } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { trackView, useRecentlyViewed } from "@/hooks/recently-viewed";
import { Clock } from "lucide-react";

export default function RecentlyViewed({ currentSlug, allProducts }: { currentSlug: string; allProducts: Product[] }) {
  useEffect(() => { trackView(currentSlug); }, [currentSlug]);
  const slugs = useRecentlyViewed(currentSlug);
  const items = slugs.map(s => allProducts.find(p => p.slug === s)).filter(Boolean) as Product[];
  if (items.length === 0) return null;
  return <section className="recently-viewed section-container"><div className="recently-head"><Clock size={15}/><span className="eyebrow" style={{ margin: 0 }}>RECENTLY VIEWED</span></div><div className="recently-grid">{items.map(p => { const from = p.sizeOptions?.length ? Math.min(...p.sizeOptions.map(o => o.price)) : p.price; return <Link className="recently-card" key={p.id} href={`/shop/${p.slug}`}><img src={p.imageUrl} alt={p.name} loading="lazy"/><span className="recently-title">{p.name}</span><span className="recently-price">{p.sizeOptions?.length ? `From ${formatPrice(from)}` : formatPrice(p.price)}</span></Link>; })}</div></section>;
}