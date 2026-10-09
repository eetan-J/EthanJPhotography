"use client";
import { useEffect, useState } from "react";
const KEY = "ejp_recent_slugs";
const MAX = 5;

export function trackView(slug: string) {
  try { const prev: string[] = JSON.parse(localStorage.getItem(KEY) || "[]"); const next = [slug, ...prev.filter(s => s !== slug)].slice(0, MAX); localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ok */ }
}

export function useRecentlyViewed(currentSlug: string) {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    try { const stored: string[] = JSON.parse(localStorage.getItem(KEY) || "[]"); setSlugs(stored.filter(s => s !== currentSlug).slice(0, 4)); } catch { /* ok */ }
  }, [currentSlug]);
  return slugs;
}