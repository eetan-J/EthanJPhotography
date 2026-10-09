"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatThread, ChatMessage } from "@/db/schema";
import { MessageCircle, X, SendHorizonal, ArrowRight, Sparkles } from "lucide-react";

type Wire = ChatMessage & { id: string };
const topics: { key: string; label: string; accent?: boolean }[] = [
  { key: "Custom order", label: "A custom order", accent: true },
  { key: "Order support", label: "Help with an order" },
  { key: "General", label: "Just a question" },
];
const storeKey = "ejp_chat_email";
const readStored = () => { try { return localStorage.getItem(storeKey); } catch { return null; } };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Wire[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async (mail: string) => {
    try {
      const res = await fetch(`/api/chat?email=${encodeURIComponent(mail)}`);
      if (res.ok) { const data = await res.json(); if (data.found) { setThread(data.thread); setMessages(data.messages); return true; } }
    } catch { /* offline */ }
    return false;
  }, []);

  useEffect(() => {
    let stored = ""; try { stored = localStorage.getItem(storeKey) || ""; } catch { /* blocked */ }
    if (stored) { setEmail(stored); loadThread(stored).then(found => { if (!found) { try { localStorage.removeItem(storeKey); } catch { /* blocked */ } } }).catch(() => {}); }
  }, [loadThread]);

  useEffect(() => {
    if (!open || !thread) return;
    const timer = setInterval(async () => { const res = await fetch(`/api/chat?email=${encodeURIComponent(thread.email)}`); if (res.ok) { const data = await res.json(); if (data.found) setMessages(data.messages); } }, 8000);
    return () => clearInterval(timer);
  }, [open, thread]);

  useEffect(() => { const onOpen = (e: Event) => { setOpen(true); const detail = (e as CustomEvent).detail; if (detail?.topic) { if (thread) fetch("/api/chat/message", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: thread.id, topic: detail.topic }) }); else setTopic(detail.topic); } };
    window.addEventListener("ejp:open-chat", onOpen);
    return () => window.removeEventListener("ejp:open-chat", onOpen);
  }, [thread]);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, open, thread]);

  async function start(e: FormEvent) {
    e.preventDefault(); setStarting(true); setError("");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, topic }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start the chat.");
      try { localStorage.setItem(storeKey, data.thread.email); } catch { /* blocked */ }
      setThread(data.thread); setMessages(data.messages);
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setStarting(false); }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !thread) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: thread.id, body }) });
      const data = await res.json();
      if (res.ok) { setMessages(prev => [...prev, data.message]); setDraft(""); }
      else throw new Error(data.error);
    } catch { setError("Your message didn't go through. Please try again."); }
    finally { setSending(false); }
  }

  function newChat() { try { localStorage.removeItem(storeKey); } catch { /* blocked */ } setThread(null); setMessages([]); setName(""); setEmail(""); setTopic("General"); }

  const fmt = (d: Date | string) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return <>
    <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Chat with Ethan"><MessageCircle size={20} strokeWidth={1.7}/><span>Chat with Ethan</span><i className="chat-fab-dot"/></button>
    {open && <div className="chat-root">
      <div className="chat-scrim" onClick={() => setOpen(false)}/>
      <section className="chat-panel" role="dialog" aria-modal="true" aria-label="Chat with Ethan">
        <header className="chat-header"><span className="chat-avatar">EJ</span><div><strong>Ethan Jeffress</strong><small>Usually replies within a day</small></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X size={20}/></button></header>

        {!thread ? <div className="chat-welcome"><div className="chat-welcome-msgs"><div className="chat-bubble ethan">Hey, I'm Ethan. I'm glad you're here. How can I help today?</div></div>
          <form onSubmit={start} className="chat-start">
            <span className="chat-start-title">Start the conversation</span>
            <p>Sign in with your email so I can find this chat next time you visit.</p>
            {email && readStored() && <div className="chat-returning">Welcome back, {name || "friend"}. Enter your email to pick up where you left off.</div>}
            <div className="chat-fields"><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={100} required={false}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" required/></div>
            <span className="chat-chips-label">I'm here about…</span>
            <div className="chat-chips">{topics.map(t => <button type="button" key={t.key} className={`chat-chip ${t.accent ? "accent" : ""} ${topic === t.key ? "selected" : ""}`} onClick={() => setTopic(t.key)}>{t.accent && <Sparkles size={13}/>} {t.label}</button>)}</div>
            {error && <span className="chat-error">{error}</span>}
            <button type="submit" className="dark-button chat-start-btn" disabled={starting}>{starting ? "Starting..." : "Start chatting"} <ArrowRight size={17}/></button>
          </form></div>
          : <div className="chat-body">
            <div className="chat-thread-msgs" ref={listRef}>
              {messages.length === 0 && <div className="chat-bubble ethan">Hi {thread.name.split(" ")[0]}! Nice to meet you. Tell me what's on your mind — {thread.topic === "Custom order" ? "I'd love to hear about your custom order." : "happy to help with anything."}</div>}
              {messages.map(m => <div key={m.id} className={`chat-bubble ${m.sender === "customer" ? "customer" : "ethan"}`}><p>{m.body}</p><time>{fmt(m.createdAt)}</time></div>)}
            </div>
            <form onSubmit={send} className="chat-composer"><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type your message…" maxLength={2000} aria-label="Your message"/><button type="submit" disabled={sending || !draft.trim()} aria-label="Send message"><SendHorizonal size={18}/></button></form>
          </div>}

        {thread && <footer className="chat-foot"><span>Chatting as <b>{thread.email}</b></span><button onClick={newChat}>Start a new chat</button></footer>}
      </section>
    </div>}
  </>;
}
