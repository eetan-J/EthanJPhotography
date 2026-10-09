"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { clearStudioToken, getStudioToken, setStudioToken, studioFetch } from "@/lib/admin-client";
import type { Product, Order } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { ArrowLeft, ArrowRight, Plus, Package, ShoppingBag, MessageCircle, Users, LayoutDashboard, Pencil, Trash2, LogOut, Check, X, ExternalLink, Download, Search, LockKeyhole, SendHorizonal, Settings as SettingsIcon, Copy, Eye, EyeOff, Star, Truck, AlertCircle } from "lucide-react";
import ProductEditor, { emptyForm, formFromProduct, type FormState } from "./product-editor";
import { defaultSettings, type StoreSettings, type ShippingRate } from "@/lib/settings-shared";
import { BASE_CATEGORIES } from "@/lib/categories-shared";
import { COUNTRY_GROUPS } from "@/lib/countries";

type Tab = "overview" | "products" | "orders" | "conversations" | "subscribers" | "settings";
type Subscriber = { id: string; email: string; createdAt: string };
type Thread = { id: string; name: string; email: string; topic: string; lastReadAt: string | null; updatedAt: Date | string; lastMessage: { sender: string; body: string; createdAt: Date | string } | null; unread: number };
type Msg = { id: string; sender: string; body: string; createdAt: Date | string };

const tabs: { key: Tab; label: string; icon: typeof Package }[] = [{ key: "overview", label: "Overview", icon: LayoutDashboard }, { key: "products", label: "Products", icon: Package }, { key: "orders", label: "Orders", icon: ShoppingBag }, { key: "conversations", label: "Conversations", icon: MessageCircle }, { key: "subscribers", label: "Subscribers", icon: Users }, { key: "settings", label: "Settings", icon: SettingsIcon }];

export default function AdminDashboard() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [editing, setEditing] = useState<{ form: FormState; isNew: boolean } | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [flash, setFlash] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    // A failed refresh keeps you signed in — only an explicit sign-out ends the session.
    try {
      const [p, o, c, s, st] = await Promise.all([studioFetch("/api/admin/products"), studioFetch("/api/admin/orders"), studioFetch("/api/admin/conversations"), studioFetch("/api/newsletter"), studioFetch("/api/admin/settings")]);
      if (p.ok) setProducts(await p.json());
      if (o.ok) setOrders(await o.json());
      if (c.ok) setThreads(await c.json());
      if (s.ok) setSubscribers(await s.json());
      if (st.ok) setSettings(await st.json());
    } catch { /* network hiccup — keep the current data and stay signed in */ }
  }, []);
  useEffect(() => {
    // If a session token exists (anywhere it could live), go straight in — the server remains the source of truth for requests.
    if (getStudioToken()) { setAuthenticated(true); load(); setChecking(false); studioFetch("/api/admin/auth").then(r => r.json()).then(data => { setConfigured(data.configured); setStripeConfigured(data.stripeConfigured); if (!data.authenticated) { clearStudioToken(); setAuthenticated(false); } }).catch(() => {}); return; }
    studioFetch("/api/admin/auth").then(r => r.json()).then(data => { setConfigured(data.configured); setStripeConfigured(data.stripeConfigured); if (data.authenticated) { setAuthenticated(true); load(); } }).catch(() => {}).finally(() => setChecking(false));
  }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(""), 4000); return () => clearTimeout(t); }, [flash]);
  useEffect(() => { if (tab === "conversations" && authenticated) { const t = setInterval(load, 15000); return () => clearInterval(t); } }, [tab, authenticated, load]);

  async function login(e: FormEvent) {
    e.preventDefault(); setLoginError("");
    let res: Response;
    try { res = await studioFetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); }
    catch { setLoginError("Couldn't reach the studio. Check your connection and try again."); return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) { setLoginError(data.error || "That password doesn't look right. Try again."); return; }
    try { setStudioToken(data.token); } catch { /* memory store always succeeds */ }
    setAuthenticated(true); setPassword(""); load();
  }
  async function logout() { clearStudioToken(); await studioFetch("/api/admin/auth", { method: "DELETE" }); setAuthenticated(false); }
  function openNew() { setEditing({ form: { ...emptyForm }, isNew: true }); }
  function openEdit(p: Product) { setEditing({ form: formFromProduct(p), isNew: false }); }
  function duplicate(p: Product) { const f = formFromProduct(p); setEditing({ form: { ...f, id: undefined, name: `${f.name} (copy)` }, isNew: true }); }
  async function toggleActive(p: Product) { const f = formFromProduct(p); await studioFetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, active: !p.active }) }); setFlash(p.active ? `“${p.name}” hidden from the shop.` : `“${p.name}” is now live.`); load(); }
  async function saveSettings(next: StoreSettings) { setSavingSettings(true); const res = await studioFetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }); if (res.ok) { setSettings(await res.json()); setFlash("Store settings saved."); } setSavingSettings(false); }
  async function deleteProduct(p: Product) { if (!window.confirm(`Remove “${p.name}” from the collection? This cannot be undone.`)) return; const res = await studioFetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }); if (res.ok) { setFlash("Product removed."); load(); } }
  async function updateOrder(order: Order, fulfillmentStatus: string, trackingNumber = order.trackingNumber, notes = order.notes) { const res = await studioFetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, fulfillmentStatus, trackingNumber, notes }) }); if (res.ok) { setFlash("Order updated."); load(); } }
  function exportSubscribers() { const csv = "Email,Subscribed At\n" + subscribers.map(s => `"${s.email.replaceAll('"', '""')}","${new Date(s.createdAt).toISOString()}"`).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "ethan-jeffress-subscribers.csv"; link.click(); URL.revokeObjectURL(link.href); }
  const paidOrders = orders.filter(o => o.paymentStatus === "paid");
  const revenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const unreadTotal = threads.reduce((sum, t) => sum + t.unread, 0);
  const date = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (checking) return <div className="admin-loading">Opening the studio...</div>;
  if (!authenticated) return <div className="admin-login-page"><Link href="/" className="admin-back"><ArrowLeft size={16}/> Back to the website</Link><div className="admin-login-card"><div className="admin-login-icon"><LockKeyhole size={23}/></div><span className="eyebrow">PRIVATE STUDIO ACCESS</span><h1>Welcome back,<br/><em>Ethan.</em></h1><p>Manage your collection, orders, and conversations all in one place.</p>{!configured ? <div className="admin-setup"><strong>Set up your studio access</strong><p>Add <code>ADMIN_PASSWORD</code> to your environment variables, then restart the app. For added security, also set <code>ADMIN_SESSION_SECRET</code> to a separate long random value.</p></div> : <form onSubmit={login}><label>Studio password<input autoFocus type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required/></label>{loginError && <span className="admin-error">{loginError}</span>}<button type="submit" className="dark-button">Enter studio <ArrowRight size={17}/></button></form>}</div><div className="admin-login-foot">ETHAN JEFFRESS PHOTOGRAPHY · STUDIO</div></div>;

  return <div className="admin-app"><aside className="admin-sidebar"><div><Link href="/" className="brand admin-brand"><span className="brand-name">ethan jeffress<span className="brand-period">.</span></span><span className="brand-sub">STUDIO DASHBOARD</span></Link><div className="admin-nav-label">WORKSPACE</div><nav>{tabs.map(t => <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}><t.icon size={18} strokeWidth={1.7}/>{t.label}{t.key === "conversations" && unreadTotal > 0 && <span className="nav-count">{unreadTotal}</span>}</button>)}</nav></div><div className="admin-sidebar-bottom"><Link href="/" target="_blank"><ExternalLink size={17}/> View website</Link><button onClick={logout}><LogOut size={17}/> Sign out</button></div></aside><div className="admin-main"><header className="admin-topbar"><span>STUDIO / {tab.toUpperCase()}</span><div><span className="admin-avatar">EJ</span><span>Ethan Jeffress</span></div></header><div className="admin-content">{flash && <div className="admin-flash"><Check size={17}/>{flash}<button onClick={() => setFlash("")}><X size={16}/></button></div>}
    {tab === "overview" && <><div className="admin-page-heading"><div><span className="eyebrow">YOUR STUDIO AT A GLANCE</span><h1>Good to see you, Ethan.</h1><p>Here's what's happening with your photography business.</p></div><button className="admin-primary" onClick={() => { setTab("products"); openNew(); }}><Plus size={17}/> Add a product</button></div><div className="stat-grid"><div><span>REVENUE COLLECTED</span><strong>{formatPrice(revenue)}</strong><small>From paid orders</small></div><div><span>TOTAL ORDERS</span><strong>{paidOrders.length}</strong><small>{orders.filter(o => o.paymentStatus === "pending").length} awaiting payment</small></div><div><span>ACTIVE PRODUCTS</span><strong>{products.filter(p => p.active).length}</strong><small>Across {new Set(products.map(p => p.category)).size} categories</small></div><div><span>UNREAD CHATS</span><strong>{unreadTotal}</strong><small>{threads.length} conversations total</small></div></div><div className="admin-two-cols"><div className="admin-panel"><div className="admin-panel-title"><h2>Recent orders</h2><button onClick={() => setTab("orders")}>View all <ArrowRight size={16}/></button></div>{orders.length ? orders.slice(0, 5).map(o => <div className="overview-row" key={o.id}><span className="order-initial">{(o.customerName || o.email || "?").charAt(0).toUpperCase()}</span><div><strong>{o.customerName || o.email || "Awaiting checkout"}</strong><small>#{o.id.slice(0, 8)} · {date(o.createdAt)}</small></div><b>{formatPrice(o.total)}</b></div>) : <div className="admin-empty-small">Your first order will appear here.</div>}</div><div className="admin-panel"><div className="admin-panel-title"><h2>Quick notes</h2></div><div className="quick-note"><span className={`status-dot ${stripeConfigured ? "green" : "amber"}`}/><div><strong>Stripe payments</strong><p>{stripeConfigured ? "Checkout and webhook credentials are configured." : "Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable payments."}</p></div></div><div className="quick-note"><span className="status-dot green"/><div><strong>Customer chat</strong><p>Conversations from the website chat bubble appear in Conversations. Replies show up in their chat.</p></div></div><div className="quick-note"><span className="status-dot green"/><div><strong>Digital products</strong><p>Deliver wallpaper and preset files manually after payment; mark the order completed when done.</p></div></div></div></div></>}
    {tab === "products" && <><div className="admin-page-heading"><div><span className="eyebrow">CURATE YOUR COLLECTION</span><h1>Products</h1><p>Add new work, change details, or take a piece off the shelf.</p></div><button className="admin-primary" onClick={openNew}><Plus size={17}/> Add product</button></div>
      <div className="pl-toolbar"><div className="admin-search"><Search size={16}/><input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}/></div><span className="pl-count">{products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length} of {products.length}</span><div className="pl-view"><button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} title="Grid view"><LayoutDashboard size={15}/></button><button className={view === "list" ? "on" : ""} onClick={() => setView("list")} title="List view"><Package size={15}/></button></div></div>
      {products.length === 0 ? <div className="admin-panel admin-empty-panel"><Package size={31}/><h3>No products yet</h3><p>Add your first piece to open the shop.</p><button className="admin-primary" onClick={openNew} style={{ marginTop: 18 }}><Plus size={16}/> Add your first product</button></div>
      : view === "grid" ? <div className="pl-grid">{products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => { const from = p.sizeOptions?.length ? Math.min(...p.sizeOptions.map(o => o.price)) : p.price; return <div className={`pl-card ${p.active ? "" : "inactive"}`} key={p.id}>
        <div className="pl-card-img"><img src={p.imageUrl} alt=""/>{p.featured && <span className="pl-badge-feat"><Star size={10}/> Featured</span>}{!p.active && <span className="pl-badge-hidden">Hidden</span>}
          <div className="pl-card-hover"><button onClick={() => openEdit(p)} title="Edit"><Pencil size={15}/> Edit</button></div></div>
        <div className="pl-card-body">
          <span className="pl-card-cat">{p.category}</span>
          <strong className="pl-card-name">{p.name}</strong>
          <div className="pl-card-price"><span>{p.sizeOptions?.length ? `From ${formatPrice(from)}` : formatPrice(p.price)}</span>{p.sizeOptions?.length ? <small>{p.sizeOptions.length} sizes</small> : null}{p.finishOptions?.length ? <small>{p.finishOptions.length} finishes</small> : null}</div>
          <div className="pl-card-meta"><span className={p.inventory === 0 ? "pl-stock-out" : ""}>{p.inventory === null ? "Unlimited stock" : `${p.inventory} in stock`}</span><span className="pl-ship">{p.shippingClass}</span></div>
          <div className="pl-card-actions"><button onClick={() => openEdit(p)}><Pencil size={14}/> Edit</button><button onClick={() => toggleActive(p)} title={p.active ? "Hide" : "Show"}>{p.active ? <EyeOff size={14}/> : <Eye size={14}/>}</button><button onClick={() => duplicate(p)} title="Duplicate"><Copy size={14}/></button><button onClick={() => deleteProduct(p)} title="Delete" className="pl-del"><Trash2 size={14}/></button></div>
        </div></div>; })}</div>
      : <div className="admin-panel admin-list-panel"><div className="table-scroll"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICING</th><th>OPTIONS</th><th>STOCK</th><th>SHIPPING</th><th>STATUS</th><th></th></tr></thead><tbody>{products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <tr key={p.id}><td><div className="table-product"><img src={p.imageUrl} alt=""/><div><strong>{p.name}</strong><small>{p.location}</small></div></div></td><td>{p.category}</td><td>{p.sizeOptions?.length ? `${p.sizeOptions.length} sizes · from ${formatPrice(Math.min(...p.sizeOptions.map(o => o.price)))}` : formatPrice(p.price)}</td><td>{p.finishOptions?.length ? p.finishOptions.join(", ") : "—"}</td><td>{p.inventory === null ? "Unlimited" : p.inventory}</td><td>{p.shippingClass}</td><td><span className={`badge ${p.active ? "badge-green" : "badge-gray"}`}>{p.active ? "Active" : "Hidden"}</span></td><td><div className="table-actions"><button onClick={() => openEdit(p)} title="Edit"><Pencil size={17}/></button><button onClick={() => duplicate(p)} title="Duplicate"><Copy size={17}/></button><button onClick={() => deleteProduct(p)} title="Delete"><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div></div>}</>}

    {tab === "settings" && <SettingsView settings={settings ?? defaultSettings} isDefault={!settings} saving={savingSettings} onSave={saveSettings} stripeConfigured={stripeConfigured}/>}
    {tab === "orders" && <><div className="admin-page-heading"><div><span className="eyebrow">FROM CHECKOUT TO DELIVERY</span><h1>Orders</h1><p>Follow each order from payment through fulfillment.</p></div>{paidOrders.length > 0 && <button className="admin-primary" onClick={() => { const csv = "Order ID,Date,Customer,Email,Payment,Status,Total\n" + paidOrders.map(o => `"${o.id.slice(0,8)}","${date(o.createdAt)}","${o.customerName}","${o.email}","${o.paymentStatus}","${o.fulfillmentStatus}","${(o.total/100).toFixed(2)}"`).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "ethan-jeffress-orders.csv"; a.click(); URL.revokeObjectURL(a.href); }}><Download size={17}/> Export CSV</button>}</div>{orders.length ? <div className="orders-stack">{orders.map(o => <OrderCard key={o.id} order={o} onUpdate={updateOrder} date={date}/>)}</div> : <div className="admin-panel admin-empty-panel"><ShoppingBag size={31}/><h3>No orders yet</h3><p>Orders will appear here as customers begin checkout.</p></div>}</>}
    {tab === "conversations" && <ConversationsView threads={threads} onRead={id => studioFetch("/api/admin/conversations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).then(() => load())} onReply={(threadId, body) => studioFetch("/api/admin/conversations/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId, body }) }).then(r => r.ok ? r.json().then(j => { load(); return j; }) : null)}/> }
    {tab === "subscribers" && <><div className="admin-page-heading"><div><span className="eyebrow">LETTERS FROM THE ROAD</span><h1>Subscribers</h1><p>People who'd like to hear from you. Export this list for your email platform.</p></div>{subscribers.length > 0 && <button className="admin-primary" onClick={exportSubscribers}><Download size={17}/> Export CSV</button>}</div><div className="admin-panel admin-list-panel"><div className="list-toolbar">{subscribers.length} subscribers</div>{subscribers.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>EMAIL ADDRESS</th><th>SUBSCRIBED</th></tr></thead><tbody>{subscribers.map(s => <tr key={s.id}><td><strong>{s.email}</strong></td><td>{date(s.createdAt)}</td></tr>)}</tbody></table></div> : <div className="admin-empty-small">Subscribers will appear here after they join from the website.</div>}</div></>}
  </div></div>
  {editing && <ProductEditor initial={editing.form} isNew={editing.isNew} onCancel={() => setEditing(null)} onSaved={msg => { setEditing(null); setFlash(msg); load(); }}/>}
  </div>;
}

function ConversationsView({ threads, onRead, onReply }: { threads: Thread[]; onRead: (id: string) => void; onReply: (threadId: string, body: string) => Promise<unknown> | void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const selected = threads.find(t => t.id === selectedId) || null;
  useEffect(() => { if (selected && selected.unread > 0) onRead(selected.id); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected) fetch("/api/chat?email=" + encodeURIComponent(selected.email)).then(r => r.ok ? r.json() : null).then(data => { if (data?.messages) setSelectedMessages(data.messages); }); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedMessages, setSelectedMessages] = useState<Msg[]>([]);
  async function sendReply(e: FormEvent) { e.preventDefault(); if (!selected || !reply.trim()) return; setSending(true); const res = await onReply(selected.id, reply.trim()); setSending(false); if (res) { setReply(""); setSelectedMessages((res as { messages: Msg[] }).messages); onRead(selected.id); } }
  const time = (d: Date | string) => new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return <div className="convo-layout">
    <div className="convo-list">
      {threads.length === 0 && <div className="admin-empty-panel" style={{ border: 0 }}><MessageCircle size={31}/><h3>No conversations yet</h3><p>When customers use the chat bubble on the site, their conversations land here.</p></div>}
      {threads.map(t => <button key={t.id} className={`convo-item ${selectedId === t.id ? "active" : ""}`} onClick={() => setSelectedId(t.id)}><span className={`convo-avatar ${t.unread ? "has-unread" : ""}`}>{t.name.charAt(0).toUpperCase()}</span><div className="convo-item-body"><div className="convo-item-top"><strong>{t.name}</strong><small>{time(t.updatedAt)}</small></div><p>{t.lastMessage ? `${t.lastMessage.sender === "ethan" ? "You: " : ""}${t.lastMessage.body}` : "Conversation started"}</p><div className="convo-item-foot"><span className={`badge ${t.topic === "Custom order" ? "badge-amber" : "badge-gray"}`}>{t.topic}</span>{t.unread > 0 && <span className="nav-count">{t.unread}</span>}</div></div></button>)}
    </div>
    <div className="convo-thread">
      {!selected ? <div className="admin-empty-panel" style={{ border: 0, height: "100%" }}><MessageCircle size={31}/><h3>Select a conversation</h3><p>Reply right here — the customer sees it in their chat bubble.</p></div>
        : <><header className="convo-thread-head"><div><strong>{selected.name}</strong><small>{selected.email}</small></div><span className={`badge ${selected.topic === "Custom order" ? "badge-amber" : "badge-gray"}`}>{selected.topic}</span></header>
          <div className="convo-thread-msgs">{selectedMessages.length === 0 && <p className="convo-empty">No messages yet.</p>}{selectedMessages.map(m => <div key={m.id} className={`convo-bubble ${m.sender === "ethan" ? "ethan" : "customer"}`}><span>{m.sender === "ethan" ? "You" : selected.name.split(" ")[0]}</span><p>{m.body}</p><time>{time(m.createdAt)}</time></div>)}</div>
          <form onSubmit={sendReply} className="convo-reply"><input value={reply} onChange={e => setReply(e.target.value)} placeholder={`Reply to ${selected.name.split(" ")[0]}…`} maxLength={3000}/><button type="submit" className="admin-primary" disabled={sending || !reply.trim()}>{sending ? "Sending…" : "Send"} <SendHorizonal size={15}/></button></form></>}
    </div>
  </div>;
}

function OrderCard({ order, onUpdate, date }: { order: Order; onUpdate: (order: Order, status: string, tracking?: string, notes?: string) => void; date: (d: Date | string) => string }) {
  const [status, setStatus] = useState(order.fulfillmentStatus);
  const [tracking, setTracking] = useState(order.trackingNumber);
  const [notes, setNotes] = useState(order.notes);
  useEffect(() => { setStatus(order.fulfillmentStatus); setTracking(order.trackingNumber); setNotes(order.notes); }, [order]);
  return <div className="admin-panel order-card"><div className="order-card-head"><div><span className="eyebrow">ORDER #{order.id.slice(0, 8).toUpperCase()}</span><h3>{order.customerName || order.email || "Checkout in progress"}</h3><small>{date(order.createdAt)} · {order.email || "Email captured after payment"}</small></div><div className="order-head-right"><strong>{formatPrice(order.total)}</strong><span className={`badge ${order.paymentStatus === "paid" ? "badge-green" : "badge-amber"}`}>{order.paymentStatus}</span></div></div><div className="order-items">{order.items.map((item, i) => <div key={i}><img src={item.imageUrl} alt=""/><span className="order-item-name">{item.name}{(item.size || item.option) && <small> — {[item.size, item.option].filter(Boolean).join(" · ")}</small>}</span><small className="order-item-qty">×{item.quantity}</small><b>{formatPrice(item.price * item.quantity)}</b></div>)}</div>{order.shippingAddress && <div className="order-address"><strong>Delivery address</strong><span>{order.shippingAddress}</span></div>}<div className="order-manage"><label>Fulfillment<select value={status} onChange={e => setStatus(e.target.value)}>{["unfulfilled", "processing", "shipped", "delivered", "completed"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></label><label>Tracking number<input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Optional tracking number"/></label><label>Internal notes<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for yourself"/></label><button className="admin-primary small" onClick={() => onUpdate(order, status, tracking, notes)}>Save update</button></div></div>;
}

function SettingsView({ settings, isDefault, saving, onSave, stripeConfigured }: { settings: StoreSettings; isDefault: boolean; saving: boolean; onSave: (s: StoreSettings) => void; stripeConfigured: boolean }) {
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [countrySearch, setCountrySearch] = useState("");
  useEffect(() => { setDraft(settings); }, [settings]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const setRate = (i: number, patch: Partial<ShippingRate>) => setDraft({ ...draft, rates: draft.rates.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const toggleCountry = (code: string) => setDraft({ ...draft, countries: draft.countries.includes(code) ? draft.countries.filter(c => c !== code) : [...draft.countries, code] });
  const groups = COUNTRY_GROUPS.map(g => ({ ...g, countries: g.countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())) })).filter(g => g.countries.length);

  return <><div className="admin-page-heading"><div><span className="eyebrow">HOW YOUR SHOP RUNS</span><h1>Settings</h1><p>Shipping rates, delivery zones, product categories, and payment status.</p></div>{dirty && <button className="admin-primary" onClick={() => onSave(draft)} disabled={saving}>{saving ? "Saving…" : "Save changes"} <Check size={16}/></button>}</div>
    {isDefault && <div className="set-note"><AlertCircle size={15}/><span>These are the starting defaults — nothing saved yet. Adjust anything below and hit save to make it live.</span></div>}
    <div className="set-cols">
      <div className="admin-panel">
        <div className="admin-panel-title"><h2>Shipping options</h2><button onClick={() => setDraft({ ...draft, rates: [...draft.rates, { id: `rate_${Date.now().toString(36)}`, name: "", price: 0, minDays: 3, maxDays: 7 }] })}><Plus size={15}/> Add option</button></div>
        <p className="set-intro">Each option appears at checkout with its own price. Customers pick the one they want.</p>
        <div className="set-rates">
          <div className="set-rate-head"><span>OPTION NAME</span><span>PRICE</span><span>DELIVERY (DAYS)</span><span/></div>
          {draft.rates.map((r, i) => <div className="set-rate" key={i}>
            <input value={r.name} onChange={e => setRate(i, { name: e.target.value })} placeholder="e.g. Express shipping"/>
            <div className="pf-money"><span>A$</span><input type="number" min="0" step="0.01" value={(r.price / 100).toString()} onChange={e => setRate(i, { price: Math.round(Number(e.target.value || 0) * 100) })}/></div>
            <div className="set-days"><input type="number" min="0" value={r.minDays} onChange={e => setRate(i, { minDays: Number(e.target.value) })}/><span>to</span><input type="number" min="0" value={r.maxDays} onChange={e => setRate(i, { maxDays: Number(e.target.value) })}/></div>
            <button onClick={() => setDraft({ ...draft, rates: draft.rates.filter((_, idx) => idx !== i) })} title="Remove"><Trash2 size={15}/></button>
          </div>)}
          {!draft.rates.length && <div className="admin-empty-small">No shipping options yet — add one so customers can check out.</div>}
        </div>
        <label className="pf-field pf-field-sm set-threshold"><span className="pf-label">Free shipping over</span><div className="pf-money"><span>A$</span><input type="number" min="0" step="0.01" value={(draft.freeShippingThreshold / 100).toString()} onChange={e => setDraft({ ...draft, freeShippingThreshold: Math.round(Number(e.target.value || 0) * 100) })}/></div><small>Orders at or above this total get your cheapest option free. Set 0 to always charge.</small></label>
        <div className="set-two">
          <label className="pf-field"><span className="pf-label">Processing time</span><input value={draft.processingTime} onChange={e => setDraft({ ...draft, processingTime: e.target.value })}/><small>Shown on product pages.</small></label>
          <label className="pf-field"><span className="pf-label">Returns policy</span><input value={draft.returnsWindow} onChange={e => setDraft({ ...draft, returnsWindow: e.target.value })}/><small>Shown under the buy buttons.</small></label>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-title"><h2>Where you ship</h2><span className="set-count">{draft.countries.length} selected</span></div>
        <p className="set-intro">Only these countries can check out. Anyone else is told you don&apos;t ship there yet and is pointed to the chat.</p>
        <div className="set-country-tools"><div className="admin-search"><Search size={15}/><input placeholder="Find a country…" value={countrySearch} onChange={e => setCountrySearch(e.target.value)}/></div><button className="pf-ghost" onClick={() => setDraft({ ...draft, countries: [] })}>Clear all</button></div>
        <div className="set-countries">{groups.map(g => {
          const codes = g.countries.map(c => c.code);
          const allOn = codes.every(c => draft.countries.includes(c));
          return <div className="set-region" key={g.region}>
            <div className="set-region-head"><strong>{g.region}</strong><button onClick={() => setDraft({ ...draft, countries: allOn ? draft.countries.filter(c => !codes.includes(c)) : [...new Set([...draft.countries, ...codes])] })}>{allOn ? "Remove all" : "Add all"}</button></div>
            <div className="set-country-grid">{g.countries.map(c => <button key={c.code} className={`set-country ${draft.countries.includes(c.code) ? "on" : ""}`} onClick={() => toggleCountry(c.code)}><span className="set-check">{draft.countries.includes(c.code) && <Check size={11}/>}</span>{c.name}</button>)}</div>
          </div>;
        })}</div>
        {!draft.countries.length && <div className="set-warn"><AlertCircle size={15}/> With no countries selected, nobody can buy physical items. Digital products still work.</div>}
      </div>

      <CategoriesPanel/>

      <div className="admin-panel">
        <div className="admin-panel-title"><h2>Payments</h2></div>
        <div className="quick-note"><span className={`status-dot ${stripeConfigured ? "green" : "amber"}`}/><div><strong>Stripe {stripeConfigured ? "connected" : "not configured"}</strong><p>{stripeConfigured ? "Checkout, shipping rates and stock updates run automatically." : "Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, then restart."}</p></div></div>
        <div className="quick-note"><span className="status-dot green"/><div><strong>Webhook endpoint</strong><p>Point Stripe at <code>/api/webhooks/stripe</code> for <code>checkout.session.completed</code>.</p></div></div>
        <div className="set-preview"><span className="pf-label">CUSTOMER SEES</span>
          {draft.rates.map((r, i) => <div className="set-preview-row" key={i}><Truck size={15}/> {r.name || "Unnamed option"} — {r.price === 0 ? "Free" : formatPrice(r.price)} <small>{r.minDays}–{r.maxDays} days</small></div>)}
          {draft.freeShippingThreshold > 0 && <div className="set-preview-row"><Check size={15}/> Free over {formatPrice(draft.freeShippingThreshold)}</div>}
          <div className="set-preview-row"><Package size={15}/> {draft.processingTime}</div>
        </div>
      </div>
    </div>
    {dirty && <div className="set-sticky"><span>You have unsaved changes</span><div><button className="pf-ghost" onClick={() => setDraft(settings)}>Discard</button><button className="admin-primary" onClick={() => onSave(draft)} disabled={saving}>{saving ? "Saving…" : "Save changes"} <Check size={15}/></button></div></div>}
  </>;
}

function CategoriesPanel() {
  const [custom, setCustom] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(() => { studioFetch("/api/admin/categories").then(r => r.json()).then(d => { if (Array.isArray(d.custom)) setCustom(d.custom); }).catch(() => {}); }, []);
  useEffect(refresh, [refresh]);
  async function add(e: FormEvent) { e.preventDefault(); const clean = name.trim(); if (!clean) return; setBusy(true); setError("");
    const res = await studioFetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: clean }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setError(data.error || "Could not add category."); return; }
    setName(""); refresh();
  }
  async function remove(cat: string) { if (!window.confirm(`Remove “${cat}”? Products already using it stay as they are.`)) return;
    const res = await studioFetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: cat }) });
    const data = await res.json(); if (!res.ok) { setError(data.error || "Could not remove category."); return; } refresh();
  }
  return <div className="admin-panel">
    <div className="admin-panel-title"><h2>Categories</h2><span className="set-count">{BASE_CATEGORIES.length + custom.length} total</span></div>
    <p className="set-intro">The built-in ones handle the shop’s special cases (digital items skip shipping). Add your own for anything else — they pick up standard shipping and appear as filters in the shop.</p>
    <div className="cat-builtin"><span className="pf-label">BUILT IN · CANNOT BE REMOVED</span><div className="cat-list">{BASE_CATEGORIES.map(c => <span className="cat-pill" key={c}>{c}</span>)}</div></div>
    {custom.length > 0 && <div className="cat-custom"><span className="pf-label">YOUR CATEGORIES</span><div className="cat-list">{custom.map(c => <span className="cat-pill removable" key={c}>{c}<button onClick={() => remove(c)} aria-label={`Remove ${c}`}><X size={12}/></button></span>)}</div></div>}
    <form onSubmit={add} className="cat-add"><input value={name} onChange={e => setName(e.target.value)} placeholder="New category name — e.g. Aerials" maxLength={40}/><button type="submit" className="admin-primary small" disabled={busy || !name.trim()}><Plus size={15}/> Add</button></form>
    {error && <span className="admin-error">{error}</span>}
  </div>;
}
