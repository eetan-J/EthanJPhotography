"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Product } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import Bag from "./bag";
import ChatWidget from "./chat-widget";
import { ArrowRight, ArrowUpRight, Menu, X, Camera, Mail, Check, ChevronDown, Package, Sparkles } from "lucide-react";

import { BASE_CATEGORIES } from "@/lib/categories-shared";
const ALL = "All work";
const hero = "https://images.pexels.com/photos/1442486/pexels-photo-1442486.jpeg?auto=compress&cs=tinysrgb&w=2200";
const storyImage = "https://images.pexels.com/photos/25975000/pexels-photo-25975000.jpeg?auto=compress&cs=tinysrgb&w=1200";

function openChat(topic?: string) { window.dispatchEvent(new CustomEvent("ejp:open-chat", { detail: topic ? { topic } : {} })); }

export default function Storefront({ products }: { products: Product[] }) {
  const [category, setCategory] = useState("All work");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterDone, setNewsletterDone] = useState(false);

  useEffect(() => { if (menuOpen) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; } }, [menuOpen]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(t); }, [notice]);

  // Filters follow the shop's real contents: canonical order first, then any custom categories alphabetically.
  const filters = useMemo(() => {
    const present = [...new Set(products.map(p => p.category))];
    const known = BASE_CATEGORIES.filter(c => present.includes(c));
    const extra = present.filter(c => !BASE_CATEGORIES.includes(c)).sort((a, b) => a.localeCompare(b));
    return [ALL, ...known, ...extra];
  }, [products]);
  const visible = useMemo(() => products.filter(p => category === ALL || p.category === category), [products, category]);
  // A category can disappear (all its products removed) — fall back to the full collection.
  useEffect(() => { if (!filters.includes(category)) setCategory(ALL); }, [filters, category]);

  async function submitNewsletter(e: FormEvent<HTMLFormElement>) { e.preventDefault(); try { const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newsletterEmail }) }); if (!res.ok) throw new Error(); setNewsletterDone(true); } catch { setNotice("Please enter a valid email address."); } }

  return <div className="site-shell">
    <header className="site-header" id="top">
      <Link href="/" className="brand" aria-label="Ethan Jeffress Photography home"><span className="brand-name">ethan jeffress<span className="brand-period">.</span></span><span className="brand-sub">PHOTOGRAPHY</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#shop">The collection</a><a href="#story">The story</a><button onClick={() => openChat()}>Chat with Ethan</button></nav>
      <div className="header-actions"><Bag products={products}/><button className="mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={24}/></button></div>
    </header>

    <main>
      <section className="hero" aria-label="Photography collection"><img className="hero-image" src={hero} alt="Misty lake and mountains beneath a soft sky"/><div className="hero-shade"/><div className="hero-topline"><span>FINE ART PHOTOGRAPHY & OBJECTS</span><span className="hero-topline-right">EST. IN THE WILD&nbsp; — &nbsp;2024</span></div><div className="hero-content"><div className="hero-kicker"><span className="hero-kicker-line"/> FOR THE WANDERERS & THE WONDERERS</div><h1>Bring the outside<br/><em>in.</em></h1><p>Thoughtful photography for the spaces we call home. Collected from the places that stay with us.</p><a href="#shop" className="hero-cta">Explore the collection <ArrowUpRight size={18} strokeWidth={1.7}/></a></div><div className="hero-bottom"><span>LANDSCAPES, LIGHT & EVERYTHING IN BETWEEN</span><a href="#intro" aria-label="Scroll to discover">SCROLL TO DISCOVER <ChevronDown size={14}/></a></div></section>

      <section className="intro section-container" id="intro"><div className="intro-left"><span className="eyebrow"><span className="eyebrow-dash"/> AN INVITATION TO SLOW DOWN</span><h2>Art that takes you<br/><em>somewhere else.</em></h2></div><div className="intro-right"><p>Some places have a way of staying with you. This is a collection of those moments — made to be lived with, looked at, and loved for years to come.</p><a href="#story" className="text-link">More about the artist <ArrowUpRight size={17}/></a></div></section>

      <section className="shop-section" id="shop"><div className="section-container"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-dash"/> THE COLLECTION</span><h2>Find your <em>somewhere.</em></h2></div><p>Made for your walls, your coffee table,<br/>and all the little moments in between.</p></div><div className="filter-row" role="group" aria-label="Filter products by category">{filters.map(cat => <button key={cat} onClick={() => setCategory(cat)} className={`filter-pill ${category === cat ? "active" : ""}`}>{cat}</button>)}</div><div className="product-grid">{visible.map((product, index) => { const from = product.sizeOptions?.length ? Math.min(...product.sizeOptions.map(o => o.price)) : product.price; return <Link className="product-card" key={product.id} href={`/shop/${product.slug}`}><div className="product-image-wrap"><img src={product.imageUrl} alt={product.name} loading={index > 3 ? "lazy" : "eager"}/><span className="product-image-overlay"><span>Explore piece <ArrowUpRight size={16}/></span></span>{product.featured && <span className="product-tag">BEST LOVED</span>}</div><div className="product-meta"><span>{product.category.toUpperCase()} <span className="meta-dot">·</span> {product.location.toUpperCase()}</span></div><div className="product-title-line"><span className="product-title">{product.name}</span><span>{product.sizeOptions?.length ? `From ${formatPrice(from)}` : formatPrice(product.price)}</span></div><div className="product-add">View details <ArrowRight size={14}/></div></Link>; })}</div>{visible.length === 0 && <div className="empty-grid">Nothing in this collection just yet. Check back soon.</div>}<div className="collection-note"><span>✳</span> Every piece begins with a moment worth remembering. <span>✳</span></div></div></section>

      <section className="feature-band"><div className="feature-band-image"><img src="https://images.pexels.com/photos/28639305/pexels-photo-28639305.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Sunlight falling over desert dunes" loading="lazy"/></div><div className="feature-band-copy"><span className="eyebrow light"><span className="eyebrow-dash"/> MORE THAN A PHOTOGRAPH</span><h2>A little piece<br/>of <em>out there.</em></h2><p>For the days you need a change of scenery without going anywhere. Bring a sense of wonder to the everyday with imagery made to make you feel something.</p><a href="#shop" className="light-link">Shop the collection <ArrowUpRight size={18}/></a><div className="feature-number">01 / 03</div></div></section>

      <section className="testimonials-section section-container"><div className="testimonials-heading"><span className="eyebrow"><span className="eyebrow-dash"/> WORDS THAT MEAN THE WORLD</span><h2>From people who<br/><em>brought it home.</em></h2></div><div className="testimonials-grid"><blockquote><p>"The print arrived beautifully wrapped and the quality is outstanding. It's the first thing I notice when I walk into my living room."</p><cite>— Sarah M., London</cite></blockquote><blockquote><p>"I bought the photobook as a gift and ended up ordering one for myself. Every page is stunning."</p><cite>— James K., New York</cite></blockquote><blockquote><p>"Ethan was incredibly helpful with a custom sizing request. The framed piece is absolutely perfect."</p><cite>— Priya D., Melbourne</cite></blockquote></div></section>

      <section className="values-section section-container"><div><Package size={25} strokeWidth={1.3}/><h3>Made to last</h3><p>Quality materials and considered details, from the first print to the final frame.</p></div><div><Sparkles size={25} strokeWidth={1.3}/><h3>Art for everyday</h3><p>Beautiful things don't have to be saved for special occasions. Live with them.</p></div><div><Mail size={25} strokeWidth={1.3}/><h3>Always here to help</h3><p>A question about a piece or an order? Pop open the chat — I read everything myself.</p></div></section>

      <section className="story-section" id="story"><div className="story-picture"><img src={storyImage} alt="Quiet coastal landscape where sand meets the sea" loading="lazy"/><span className="story-picture-label">A LIFE SPENT LOOKING CLOSER ↗</span></div><div className="story-copy"><span className="eyebrow"><span className="eyebrow-dash"/> BEHIND THE LENS</span><h2>Hey, I'm<br/><em>Ethan.</em></h2><p>I believe there's magic in paying attention. In the way the light shifts, the quiet before the world wakes up, and the landscapes that make you pause for just a second longer.</p><p>Ethan Jeffress Photography is a home for those moments. A collection of imagery created with curiosity, care, and a deep love for the places we share.</p><button className="dark-button" onClick={() => openChat()}>Let's connect <ArrowUpRight size={17}/></button><div className="story-signature">Ethan Jeffress</div></div></section>

      <section className="contact-banner"><div><span className="eyebrow light"><span className="eyebrow-dash"/> NO WALLS BETWEEN US</span><h2>Questions?<br/><em>Custom ideas?</em></h2></div><div><p>Chat with me directly about a piece, a custom order, or anything in between. It's the fastest way to reach me.</p><button onClick={() => openChat("Custom order")} className="contact-banner-button">Start the chat <ArrowUpRight size={18}/></button></div></section>

      <section className="newsletter-section section-container"><div><span className="eyebrow"><span className="eyebrow-dash"/> LETTERS FROM THE ROAD</span><h2>A little wonder<br/>in your <em>inbox.</em></h2></div><div><p>First looks at new work, notes from the road, and the occasional good thing. No noise, just the nice stuff.</p>{newsletterDone ? <div className="newsletter-success"><Check size={18}/> You're on the list. Thank you!</div> : <form onSubmit={submitNewsletter} className="newsletter-form"><input type="email" required placeholder="Your email address" value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} aria-label="Email address"/><button type="submit" aria-label="Subscribe"><ArrowRight size={20}/></button></form>}<small>By subscribing, you agree to receive occasional emails. Unsubscribe anytime.</small></div></section>
    </main>

    <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link href="/" className="brand brand-footer"><span className="brand-name">ethan jeffress<span className="brand-period">.</span></span><span className="brand-sub">PHOTOGRAPHY</span></Link><p>For the places that stay with us.</p></div><div className="footer-col"><span>EXPLORE</span><a href="#shop">The collection</a><a href="#story">The story</a><button onClick={() => openChat()}>Chat with me</button></div><div className="footer-col"><span>THE DETAILS</span><button onClick={() => openChat("Custom order")}>Custom orders</button><button onClick={() => openChat("Order support")}>Shipping & support</button><Link href="/admin">Studio dashboard</Link></div><div className="footer-col"><span>SAY HELLO</span><button onClick={() => openChat()}>Start a conversation ↗</button><a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Camera size={19}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ETHAN JEFFRESS PHOTOGRAPHY. ALL RIGHTS RESERVED.</span><span>MADE FOR THE MOMENTS THAT MATTER. ✳</span><a href="#top">BACK TO TOP ↑</a></div></footer>

    {menuOpen && <div className="mobile-nav-overlay"><button className="overlay-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Menu size={24}/></button><a onClick={() => setMenuOpen(false)} href="#shop">The collection</a><a onClick={() => setMenuOpen(false)} href="#story">The story</a><button onClick={() => { setMenuOpen(false); openChat(); }}>Chat with Ethan</button></div>}
    <ChatWidget/>
    {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}
  </div>;
}
