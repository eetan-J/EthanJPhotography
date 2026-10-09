"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { Product } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { X, Plus, Trash2, UploadCloud, Star, Check, Wand2, MapPin, ChevronDown, ShieldCheck, Truck, RotateCcw, ArrowRight, Eye, Pencil, AlertCircle, ImagePlus, SlidersHorizontal, PackageCheck } from "lucide-react";
import { DIGITAL_CATEGORIES } from "@/lib/categories-shared";
import { studioFetch } from "@/lib/admin-client";

export type FormState = {
  id?: string;
  name: string; category: string; location: string; description: string;
  images: string[];
  price: string;
  sizes: { label: string; price: string }[];
  finishes: string[];
  details: string[];
  inventory: string;
  shippingClass: string;
  shippingExcludes: string[];
  featured: boolean; active: boolean;
};

export const DEFAULT_DETAILS: Record<string, string[]> = {
  "Prints": ["Printed on Hahnemühle fine art paper, 308gsm", "Matte finish with a subtle, velvety texture", "Hand-checked before it leaves the studio", "Unframed — your choice of framing"],
  "Framed Prints": ["FSC-certified solid wood frame", "Acid-free cotton rag mat", "Museum-grade anti-reflective glass", "Hardware and picture hooks included"],
  "Wallpapers": ["12 curated landscapes, optimized for every screen", "Desktop 4K · iPad · iPhone resolutions", "Instant download link, delivered to your inbox", "Yours to keep — no licensing, no fine print"],
  "Presets": ["6 hand-tuned presets for natural, film-inspired tones", "Step-by-step installation guide", "Works with Lightroom Desktop, CC, and mobile", "Free updates whenever I refine the pack"],
  "Photobooks": ["120 pages, 10×14 in full-bleed images", "Lay-flat hardcover binding", "250gsm premium paper stock", "Linen-textured cover in your chosen finish"],
};

export const PRESETS: Record<string, { sizes: { label: string; price: string }[]; finishes: string[]; shippingClass: string; price: string; location: string }> = {
  "Prints": { price: "85", location: "", shippingClass: "standard", finishes: [], sizes: [{ label: "12×16 in", price: "65" }, { label: "18×24 in", price: "95" }, { label: "24×32 in", price: "135" }, { label: "30×40 in", price: "185" }] },
  "Framed Prints": { price: "245", location: "", shippingClass: "oversized", finishes: ["Natural Oak", "Matte Black", "Gallery White"], sizes: [{ label: "12×16 in", price: "145" }, { label: "18×24 in", price: "215" }, { label: "24×32 in", price: "310" }, { label: "30×40 in", price: "420" }] },
  "Wallpapers": { price: "18", location: "Digital collection", shippingClass: "digital", finishes: [], sizes: [] },
  "Presets": { price: "29", location: "Digital collection", shippingClass: "digital", finishes: [], sizes: [] },
  "Photobooks": { price: "68", location: "Collected journeys", shippingClass: "standard", finishes: ["Matte cover", "Gloss cover"], sizes: [{ label: "8×10 in", price: "52" }, { label: "10×10 in", price: "68" }, { label: "12×12 in", price: "92" }, { label: "14×14 in", price: "120" }] },
};

export const emptyForm: FormState = { name: "", category: "Prints", location: "", description: "", images: [], price: "", sizes: [], finishes: [], details: [], inventory: "", shippingClass: "standard", shippingExcludes: [], featured: false, active: true };

export function formFromProduct(p: Product): FormState {
  return {
    id: p.id, name: p.name, category: p.category, location: p.location, description: p.description,
    images: p.images?.length ? p.images : [p.imageUrl],
    price: (p.price / 100).toString(),
    sizes: (p.sizeOptions || []).map(o => ({ label: o.label, price: (o.price / 100).toString() })),
    finishes: p.finishOptions || [],
    details: p.details || DEFAULT_DETAILS[p.category] || [],
    inventory: p.inventory === null ? "" : String(p.inventory),
    shippingClass: p.shippingClass || "standard",
    shippingExcludes: p.shippingExcludes || [],
    featured: p.featured, active: p.active,
  };
}

const EYEBROW: Record<string, string> = { "Prints": "FINE ART PRINT", "Framed Prints": "GALLERY-FRAMED PRINT", "Wallpapers": "DIGITAL DOWNLOAD", "Presets": "LIGHTROOM PRESETS", "Photobooks": "COFFEE TABLE PHOTOBOOK" };

type StoreRate = { id: string; name: string; price: number; minDays: number; maxDays: number };

function AutoArea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }, [value]);
  return <textarea ref={ref} className={className} value={value} placeholder={placeholder} rows={1} onChange={e => onChange(e.target.value)}/>;
}

export default function ProductEditor({ initial, isNew, onCancel, onSaved }: { initial: FormState; isNew: boolean; onCancel: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState<FormState>(initial);
  const [preview, setPreview] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [previewSize, setPreviewSize] = useState(0);
  const [finishDraft, setFinishDraft] = useState("");
  const [detailDraft, setDetailDraft] = useState("");
  const [categories, setCategories] = useState<string[]>(Object.keys(PRESETS));
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [rates, setRates] = useState<StoreRate[]>([]);
  const [freeThreshold, setFreeThreshold] = useState(0);
  const [returnsNote, setReturnsNote] = useState("");
  const [processingNote, setProcessingNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch("/api/shipping").then(r => r.json()).then(d => {
      if (Array.isArray(d.rates)) setRates(d.rates);
      setFreeThreshold(Number(d.freeShippingThreshold) || 0);
      setReturnsNote(String(d.returnsWindow || ""));
      setProcessingNote(String(d.processingTime || ""));
    }).catch(() => {});
    refreshCategories();
  }, []);
  useEffect(() => { if (activeImg >= form.images.length) setActiveImg(Math.max(0, form.images.length - 1)); }, [form.images.length, activeImg]);

  const refreshCategories = useCallback(() => { studioFetch("/api/admin/categories").then(r => r.json()).then(d => { if (Array.isArray(d.categories)) setCategories(d.categories); }).catch(() => {}); }, []);

  async function createCategory() {
    const name = newCat.trim();
    if (!name) { setAddingCat(false); return; }
    const res = await studioFetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not add category."); setAddingCat(false); setNewCat(""); return; }
    setCategories(data.categories); setForm(f => ({ ...f, category: name })); applyPreset(name);
    setAddingCat(false); setNewCat(""); setError("");
  }

  function applyPreset(category: string, force = false) {
    const p = PRESETS[category];
    setForm(f => ({
      ...f, category,
      sizes: p && (force || !f.sizes.length) ? p.sizes.map(s => ({ ...s })) : f.sizes,
      finishes: p && (force || !f.finishes.length) ? [...p.finishes] : f.finishes,
      details: p && (force || !f.details.length) ? [...(DEFAULT_DETAILS[category] || [])] : f.details,
      shippingClass: p && (force || isNew) ? p.shippingClass : DIGITAL_CATEGORIES.includes(category) ? "digital" : f.shippingClass,
      price: p && (force || !f.price) ? p.price : f.price,
      location: p && (force || !f.location) ? p.location : f.location,
    }));
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 8 - form.images.length);
    if (!list.length) return;
    setUploading(true); setError("");
    for (const file of list) {
      if (!file.type.startsWith("image/")) { setError(`${file.name} isn't an image file.`); continue; }
      const body = new FormData(); body.append("file", file);
      try {
        const res = await studioFetch("/api/admin/upload", { method: "POST", body });
        if (res.status === 401) { setError("Upload was rejected because the studio session wasn't attached. Sign out, sign in once more, and try the photo again."); setUploading(false); return; }
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Upload failed."); continue; }
        setForm(f => ({ ...f, images: [...f.images, data.url].slice(0, 8) }));
      } catch { setError("Upload failed — check your connection and try again."); }
    }
    setUploading(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDragOver(false);
    if (preview) return;
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
    else { const t = e.dataTransfer.getData("text"); if (/^https?:\/\//.test(t)) setForm(f => ({ ...f, images: [...f.images, t.trim()].slice(0, 8) })); }
  }

  const removeImage = (i: number) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  const makeMain = (i: number) => setForm(f => { const next = [...f.images]; const [m] = next.splice(i, 1); return { ...f, images: [m, ...next] }; });
  const addFinish = () => { const v = finishDraft.trim(); if (v && !form.finishes.includes(v)) set("finishes", [...form.finishes, v].slice(0, 10)); setFinishDraft(""); };
  const addDetail = () => { const v = detailDraft.trim(); if (v) set("details", [...form.details, v].slice(0, 12)); setDetailDraft(""); };

  const unlimited = form.inventory === "";
  const sizePrices = form.sizes.map(s => Number(s.price)).filter(n => n > 0);
  const basePrice = Number(form.price || 0) * 100;
  const shownPrice = form.sizes.length ? (Number(form.sizes[previewSize]?.price || 0) * 100) : basePrice;
  const fromPrice = sizePrices.length ? Math.min(...sizePrices) * 100 : basePrice;
  const isDigital = form.shippingClass === "digital";
  const availableRates = rates.filter(r => !form.shippingExcludes.includes(r.id));

  const issues: string[] = [];
  if (!form.name.trim()) issues.push("Add a product name");
  if (!form.images.length) issues.push("Add at least one image");
  if (!(Number(form.price) >= 1)) issues.push("Set a base price");

  async function save() {
    if (issues.length) { setError(issues[0] + "."); return; }
    setSaving(true); setError("");
    const res = await studioFetch("/api/admin/products", { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, inventory: unlimited ? "" : form.inventory }) });
    if (res.status === 401) { setSaving(false); setError("Couldn't save — the studio session wasn't attached. Sign out and back in, then save again."); return; }
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setError(data.error || "Could not save."); return; }
    onSaved(isNew ? `“${data.name}” added to the collection.` : `“${data.name}” updated.`);
  }

  const ed = !preview;

  const rail = <div className="pe-rail-inner">
    <span className="pe-rail-title">PUBLISH</span>
    <button className={`pf-toggle ${form.active ? "on" : ""}`} onClick={() => set("active", !form.active)}><span className="pf-switch"/><div><strong>Visible in shop</strong><small>{form.active ? "Customers can buy this" : "Hidden from the website"}</small></div></button>
    <button className={`pf-toggle ${form.featured ? "on" : ""}`} onClick={() => set("featured", !form.featured)}><span className="pf-switch"/><div><strong>Featured</strong><small>“Best loved” badge, sorted first</small></div></button>

    <span className="pe-rail-title">STOCK</span>
    <button className={`pf-toggle ${unlimited ? "on" : ""}`} onClick={() => set("inventory", unlimited ? "10" : "")}><span className="pf-switch"/><div><strong>Unlimited stock</strong><small>{unlimited ? "Never runs out" : "Tracked quantity"}</small></div></button>
    {!unlimited && <>
      <label className="pf-field"><span className="pf-label">Quantity available</span><input type="number" min="0" step="1" value={form.inventory} onChange={e => set("inventory", e.target.value)}/><small>Drops automatically when an order is paid. At 0 the piece shows “Sold out”.</small></label>
      <div className="pe-quick">{[5, 10, 25].map(n => <button key={n} onClick={() => set("inventory", String(n))}>+{n}</button>)}<button onClick={() => set("inventory", "0")} className="pe-out">Sold out</button></div>
    </>}

    <span className="pe-rail-title">SHIPPING</span>
    <div className="pe-ship-opts">{[
      { key: "standard", t: "Standard", d: "Store rates apply" },
      { key: "oversized", t: "Oversized", d: "Framed & large pieces" },
      { key: "digital", t: "Digital", d: "No shipping — email delivery" },
      { key: "free", t: "Always free", d: "Never charge shipping" },
    ].map(o => <button key={o.key} className={`pe-ship-opt ${form.shippingClass === o.key ? "on" : ""}`} onClick={() => set("shippingClass", o.key)}><strong>{o.t}</strong><small>{o.d}</small></button>)}</div>

    {form.shippingClass !== "digital" && form.shippingClass !== "free" && rates.length > 0 && <>
      <span className="pe-rail-title">SHIPPING OPTIONS</span>
      <p className="pe-rail-note">Only the ticked options are offered for this piece.</p>
      <div className="pe-rates">{rates.map(r => {
        const on = !form.shippingExcludes.includes(r.id);
        return <button key={r.id} className={`pe-rate ${on ? "on" : ""}`} onClick={() => set("shippingExcludes", on ? [...form.shippingExcludes, r.id] : form.shippingExcludes.filter(x => x !== r.id))}>
          <span className="set-check">{on && <Check size={11}/>}</span>
          <span className="pe-rate-name">{r.name}</span>
          <span className="pe-rate-price">{r.price === 0 ? "Free" : formatPrice(r.price)}</span>
        </button>;
      })}</div>
      {freeThreshold > 0 && <p className="pe-rail-note">Free shipping over {formatPrice(freeThreshold)} store-wide.</p>}
    </>}

    <div className="pe-checklist">{issues.length === 0 ? <span className="pf-ok"><Check size={14}/> Ready to publish</span> : issues.map(i => <span key={i} className="pf-todo"><AlertCircle size={13}/> {i}</span>)}</div>
    <button className="admin-primary pe-rail-save" onClick={save} disabled={saving}>{saving ? "Saving…" : isNew ? "Publish product" : "Save changes"} <ArrowRight size={15}/></button>
    <button className="pf-ghost pe-rail-close" onClick={() => setRailOpen(false)}><X size={14}/> Close panel</button>
  </div>;

  return <div className="pe-root">
    <header className="pe-bar">
      <div className="pe-bar-left">
        <button className="pe-close" onClick={onCancel} aria-label="Close editor"><X size={19}/></button>
        <div><span className="pe-bar-kicker">{isNew ? "NEW PRODUCT" : "EDITING"}</span><strong>{form.name || "Untitled piece"}</strong></div>
      </div>
      <div className="pe-bar-right">
        {issues.length > 0 && <span className="pe-issues"><AlertCircle size={14}/> {issues[0]}</span>}
        <div className="pe-mode">
          <button className={ed ? "on" : ""} onClick={() => setPreview(false)}><Pencil size={13}/> Edit</button>
          <button className={preview ? "on" : ""} onClick={() => setPreview(true)}><Eye size={13}/> Preview</button>
        </div>
        <button className="pe-rail-toggle" onClick={() => setRailOpen(true)}><SlidersHorizontal size={14}/> Stock & shipping</button>
        <button className="pe-cancel" onClick={onCancel}>Cancel</button>
        <button className="admin-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : isNew ? "Publish" : "Save changes"} <Check size={15}/></button>
      </div>
    </header>

    {error && <div className="pe-error"><AlertCircle size={15}/> {error}<button onClick={() => setError("")}><X size={14}/></button></div>}

    <div className="pe-body">
      <div className={`pe-canvas ${ed ? "editing" : ""}`}>
        <div className="pe-page">
          <div className="pe-crumb">All work <span>/</span> {form.category} <span>/</span> <strong>{form.name || "Untitled piece"}</strong></div>

          <div className="pe-hero">
            <div className="pe-gallery">
              <div className={`pe-main-img ${dragOver ? "over" : ""}`} onDragOver={e => { if (ed) { e.preventDefault(); setDragOver(true); } }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
                {form.images[activeImg] ? <>
                  <img src={form.images[activeImg]} alt={form.name}/>
                  {form.location && <span className="pp-image-tag"><MapPin size={14}/> {form.location}</span>}
                  {ed && <div className="pe-img-overlay">
                    <button onClick={() => fileRef.current?.click()}><UploadCloud size={15}/> {uploading ? "Uploading…" : "Replace"}</button>
                    {activeImg !== 0 && <button onClick={() => makeMain(activeImg)}><Star size={15}/> Make main</button>}
                    <button onClick={() => removeImage(activeImg)}><Trash2 size={15}/> Remove</button>
                  </div>}
                </> : <button className="pe-img-empty" onClick={() => ed && fileRef.current?.click()}>
                  <UploadCloud size={30}/>
                  <strong>{uploading ? "Uploading…" : "Drop a photo here, or click to upload"}</strong>
                  <small>JPG, PNG, WebP or AVIF · up to 8MB · or paste an image link</small>
                </button>}
              </div>
              <div className="pe-thumbs">
                {form.images.map((img, i) => <button key={img + i} className={`pe-thumb ${i === activeImg ? "on" : ""}`} onClick={() => setActiveImg(i)}>
                  <img src={img} alt=""/>{i === 0 && <span className="pe-thumb-main"><Star size={9}/></span>}
                </button>)}
                {ed && form.images.length < 8 && <button className="pe-thumb pe-thumb-add" onClick={() => fileRef.current?.click()} title="Add image"><ImagePlus size={17}/></button>}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={e => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}/>
            </div>

            <div className="pe-info">
              <div className="pe-eyebrow-row">
                <span className="eyebrow"><span className="eyebrow-dash"/> {EYEBROW[form.category] || form.category.toUpperCase()}</span>
                {ed && <select className="pe-cat-select" value={form.category} onChange={e => { if (e.target.value === "__new") { setAddingCat(true); setTimeout(() => catRef.current?.focus(), 30); } else applyPreset(e.target.value); }}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                  <option value="__new">＋ New category…</option>
                </select>}
              </div>
              {ed && addingCat && <div className="pe-newcat"><input ref={catRef} value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); createCategory(); } if (e.key === "Escape") { setAddingCat(false); setNewCat(""); } }} placeholder="e.g. Aerials, Portraits, Editions" autoFocus/><button onClick={createCategory}>Create</button><button className="pe-newcat-x" onClick={() => { setAddingCat(false); setNewCat(""); }}><X size={14}/></button></div>}

              {ed ? <AutoArea className="pe-title-input" value={form.name} onChange={v => set("name", v)} placeholder="Name this piece…"/> : <h1 className="pe-title">{form.name || "Untitled piece"}</h1>}

              <div className="pe-loc"><MapPin size={15}/>{ed ? <input className="pe-loc-input" value={form.location} onChange={e => set("location", e.target.value)} placeholder="Where was it taken?"/> : <span>{form.location}</span>}</div>

              {ed ? <AutoArea className="pe-desc-input" value={form.description} onChange={v => set("description", v)} placeholder="Tell the story behind this piece — where it was taken, how it feels, what makes it special."/> : <p className="pe-desc">{form.description}</p>}

              {ed && PRESETS[form.category] && <button className="pe-preset" onClick={() => applyPreset(form.category, true)}><Wand2 size={14}/> Fill in typical {form.category.toLowerCase()} sizes, options & details</button>}

              <div className="purchase-box pe-purchase">
                <div className="purchase-price-row">
                  <span>{form.sizes.length ? "From" : "Price"}</span>
                  {ed ? <div className="pe-price-edit"><span>A$</span><input type="number" min="1" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} placeholder="85"/></div>
                    : <strong>{formatPrice(form.sizes.length ? fromPrice : basePrice)}</strong>}
                </div>

                {(ed || form.sizes.length > 0) && <div className="selector-block">
                  <div className="pe-sel-head"><span className="selector-label">Size</span>{ed && PRESETS[form.category]?.sizes.length > 0 && <button className="pe-mini" onClick={() => set("sizes", PRESETS[form.category].sizes.map(s => ({ ...s })))}><Wand2 size={12}/> defaults</button>}</div>
                  {ed ? <div className="pe-size-rows">
                    {form.sizes.map((s, i) => <div className="pe-size-row" key={i}>
                      <input value={s.label} onChange={e => set("sizes", form.sizes.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="12×16 in"/>
                      <div className="pe-money-sm"><span>$</span><input type="number" min="1" step="0.01" value={s.price} onChange={e => set("sizes", form.sizes.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))} placeholder="65"/></div>
                      <button onClick={() => set("sizes", form.sizes.filter((_, idx) => idx !== i))} title="Remove"><Trash2 size={14}/></button>
                    </div>)}
                    {form.sizes.length < 8 && <button className="pe-add-inline" onClick={() => set("sizes", [...form.sizes, { label: "", price: "" }])}><Plus size={14}/> Add a size</button>}
                  </div> : <div className={`size-select ${sizeOpen ? "open" : ""}`}>
                    <button className="size-select-trigger" onClick={() => setSizeOpen(!sizeOpen)}><span>{form.sizes[previewSize]?.label}</span><span className="size-price-tag">{formatPrice(shownPrice)}</span><ChevronDown size={14} className="size-chevron"/></button>
                    <ul className="size-select-menu">{form.sizes.map((s, i) => <li key={i}><button className={i === previewSize ? "active" : ""} onClick={() => { setPreviewSize(i); setSizeOpen(false); }}><span className="size-option-label">{s.label}</span><span className="size-option-price">{formatPrice(Number(s.price || 0) * 100)}</span>{i === previewSize && <Check size={14}/>}</button></li>)}</ul>
                  </div>}
                </div>}

                {(ed || form.finishes.length > 0) && <div className="selector-block">
                  <div className="pe-sel-head"><span className="selector-label">{form.category === "Framed Prints" ? "Frame" : form.category === "Photobooks" ? "Cover" : "Finish"}</span>{ed && PRESETS[form.category]?.finishes.length > 0 && <button className="pe-mini" onClick={() => set("finishes", [...PRESETS[form.category].finishes])}><Wand2 size={12}/> defaults</button>}</div>
                  <div className="chips">
                    {form.finishes.map((f, i) => <span key={f} className={`chip ${!ed && i === 0 ? "active" : ""}`}>{f}{ed && <button className="pe-chip-x" onClick={() => set("finishes", form.finishes.filter(x => x !== f))}><X size={11}/></button>}</span>)}
                    {ed && form.finishes.length < 10 && <input className="pe-chip-input" value={finishDraft} onChange={e => setFinishDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFinish(); } }} onBlur={addFinish} placeholder={form.finishes.length ? "Add…" : "Type a finish, press Enter"}/>}
                  </div>
                </div>}

                {!unlimited && Number(form.inventory) === 0 && <div className="pe-soldout"><PackageCheck size={15}/> This shows as “Sold out” — stock is 0.</div>}

                <div className="purchase-actions"><div className="dark-button buy-button pe-fake">Add to bag</div><div className="buy-now-button pe-fake">Buy now</div></div>
                <div className="purchase-trust"><span><ShieldCheck size={14}/> Stripe secure</span><span>{isDigital ? "Instant delivery" : availableRates.length ? `${availableRates.length} shipping option${availableRates.length === 1 ? "" : "s"}` : "Free shipping"}</span><span>{isDigital ? "Yours to keep" : returnsNote || "Free returns"}</span></div>
              </div>

              <div className="pp-features"><span><ShieldCheck size={14}/> Secure checkout</span><span><Truck size={14}/> {isDigital ? "Instant download" : processingNote || (freeThreshold > 0 ? `Free shipping over ${formatPrice(freeThreshold)}` : "Worldwide shipping")}</span><span><RotateCcw size={14}/> {isDigital ? "Yours to keep" : returnsNote || "30-day returns"}</span></div>

              <div className="pp-details">
                <div className="pe-sel-head"><h3>{form.category === "Framed Prints" ? "In the box" : isDigital ? "What you receive" : "The details"}</h3>{ed && DEFAULT_DETAILS[form.category] && <button className="pe-mini" onClick={() => set("details", [...DEFAULT_DETAILS[form.category]])}><Wand2 size={12}/> defaults</button>}</div>
                <ul>{form.details.map((d, i) => <li key={i}><Check size={14}/>{ed ? <><input className="pe-detail-input" value={d} onChange={e => set("details", form.details.map((x, idx) => idx === i ? e.target.value : x))}/><button className="pe-detail-x" onClick={() => set("details", form.details.filter((_, idx) => idx !== i))}><Trash2 size={13}/></button></> : <span>{d}</span>}</li>)}</ul>
                {ed && form.details.length < 12 && <div className="pe-detail-add"><Plus size={14}/><input value={detailDraft} onChange={e => setDetailDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addDetail(); } }} onBlur={addDetail} placeholder="Add a detail line…"/></div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="pe-rail">{rail}</aside>
    </div>

    {railOpen && <div className="pe-rail-drawer" onMouseDown={() => setRailOpen(false)}><div className="pe-rail-panel" onMouseDown={e => e.stopPropagation()}>{rail}</div></div>}
  </div>;
}
