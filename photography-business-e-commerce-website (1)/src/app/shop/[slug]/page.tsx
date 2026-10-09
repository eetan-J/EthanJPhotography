import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatPrice } from "@/lib/format";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import Gallery from "@/components/gallery";
import Bag from "@/components/bag";
import ProductPurchase from "@/components/product-purchase";
import ChatWidget from "@/components/chat-widget";
import RecentlyViewed from "@/components/recently-viewed";
import { ArrowLeft, MapPin, Check, Download, Frame, Image as ImageIcon, BookOpen, SlidersHorizontal, ArrowUpRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

const categoryCopy: Record<string, { eyebrow: string; delivery: string; details: { title: string; items: string[] } }> = {
  "Prints": { eyebrow: "FINE ART PRINT", delivery: "Archival fine art print, ready to frame", details: { title: "The details", items: ["Printed on Hahnemühle fine art paper, 308gsm", "Matte finish with a subtle, velvety texture", "Hand-checked before it leaves the studio", "Unframed — fold-flat or rolled, your choice of framing"] } },
  "Framed Prints": { eyebrow: "GALLERY-FRAMED PRINT", delivery: "Arrives framed, ready to hang", details: { title: "In the box", items: ["FSC-certified solid wood frame", "Acid-free cotton rag mat", "Museum-grade anti-reflective glass", "Hardware and picture hooks included"] } },
  "Wallpapers": { eyebrow: "DIGITAL DOWNLOAD", delivery: "Instant delivery by email", details: { title: "What you receive", items: ["12 curated landscapes, optimized for every screen", "Desktop 4K · iPad · iPhone resolutions", "Instant download link, delivered to your inbox", "Yours to keep — no licensing, no fine print"] } },
  "Presets": { eyebrow: "LIGHTROOM PRESETS", delivery: "Instant delivery by email", details: { title: "Inside the pack", items: ["6 hand-tuned presets for natural, film-inspired tones", "Step-by-step installation guide", "Works with Lightroom Desktop, CC, and mobile", "Free updates whenever I refine the pack"] } },
  "Photobooks": { eyebrow: "COFFEE TABLE PHOTOBOOK", delivery: "Bound in a print studio, shipped in 1–2 weeks", details: { title: "Book specs", items: ["120 pages, 10×14 in full-bleed images", "Lay-flat hardcover binding", "250gsm premium paper stock", "Linen-textured cover in your chosen finish"] } },
};

const iconFor: Record<string, typeof ImageIcon> = { "Prints": ImageIcon, "Framed Prints": Frame, Wallpapers: Download, Presets: SlidersHorizontal, Photobooks: BookOpen };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await getCatalog();
  const product = rows.find(p => p.slug === slug);
  return { title: product ? `${product.name} — Ethan Jeffress Photography` : "Product — Ethan Jeffress Photography" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = await getCatalog();
  const product = all.find(p => p.slug === slug);
  if (!product) notFound();
  const copy = categoryCopy[product.category] || categoryCopy["Prints"];
  const Icon = iconFor[product.category] || ImageIcon;
  const sizes = product.sizeOptions?.length ? product.sizeOptions : null;
  const related = all.filter(p => p.id !== product.id && p.category === product.category).slice(0, 2);
  const more = related.length < 3 ? all.filter(p => p.id !== product.id && !related.some(r => r.id === p.id)).slice(0, 3 - related.length) : [];
  const isDigital = ["Wallpapers", "Presets"].includes(product.category) || product.shippingClass === "digital";
  const settings = await getSettings();
  const gallery = product.images?.length ? product.images : [product.imageUrl];

  return <div className="shop-page">
    <header className="shop-page-header"><Link href="/" className="brand"><span className="brand-name">ethan jeffress<span className="brand-period">.</span></span><span className="brand-sub">PHOTOGRAPHY</span></Link><Bag products={all}/></header>
    <div className="crumb section-container"><Link href="/#shop"><ArrowLeft size={15}/> All work</Link><span>/</span><span>{product.category}</span><span>/</span><strong>{product.name}</strong></div>

    <div className="pp-hero section-container">
      <Gallery images={gallery} name={product.name} location={product.location}/>
      <div className="pp-info">
        <span className="eyebrow"><span className="eyebrow-dash"/> {copy.eyebrow}</span>
        <h1>{product.name}</h1>
        <p className="pp-location"><MapPin size={15}/> {product.location}</p>
        <p className="pp-description">{product.description}</p>
        <ProductPurchase product={product}/>
        <div className="pp-features">
          <span><ShieldCheck size={14}/> Secure checkout</span>
          <span><Truck size={14}/> {isDigital ? "Instant download" : settings.freeShippingThreshold > 0 ? `Free shipping over ${formatPrice(settings.freeShippingThreshold)}` : settings.processingTime}</span>
          <span><RotateCcw size={14}/> {isDigital ? "Yours to keep" : settings.returnsWindow}</span>
        </div>
        <div className="pp-details"><h3>{copy.details.title}</h3><ul>{(product.details?.length ? product.details : copy.details.items).map(item => <li key={item}><Check size={14}/> {item}</li>)}</ul></div>
      </div>
    </div>

    <div className="pp-statement section-container"><span className="eyebrow"><Icon size={15}/> {copy.delivery}</span><div className="pp-statement-sep"/><p className="pp-statement-text">{isDigital ? "The moment you check out, your download link arrives in your inbox. Most customers have the files on their devices in under a minute." : product.category === "Photobooks" ? "Every book is bound by hand in a dedicated print studio and checked page by page before it's packed. You'll receive a tracking number the moment it ships." : "Each piece is printed, checked by hand, and wrapped in protective kraft and soft padding. You'll get a tracking number the moment it's on its way."}</p></div>

    <RecentlyViewed currentSlug={product.slug} allProducts={all}/>

    <div className="pp-related section-container"><div className="related-head"><div><span className="eyebrow"><span className="eyebrow-dash"/> KEEP EXPLORING</span><h2>You might also<br/><em>love this.</em></h2></div><Link href="/#shop">Browse the whole collection <ArrowUpRight size={17}/></Link></div><div className="related-grid">{[...related, ...more].map(p => { const from = p.sizeOptions?.length ? Math.min(...p.sizeOptions.map(o => o.price)) : p.price; return <Link className="related-card" key={p.id} href={`/shop/${p.slug}`}><img src={p.imageUrl} alt={p.name} loading="lazy"/><span className="related-meta">{p.category}</span><span className="related-title">{p.name}</span><span className="related-price">{p.sizeOptions?.length ? `From ${formatPrice(from)}` : formatPrice(p.price)}</span></Link>; })}</div></div>

    <ChatWidget/>
  </div>;
}