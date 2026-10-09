import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { isValidCountry } from "./countries";

import { defaultSettings, type ShippingRate, type StoreSettings } from "./settings-shared";

export { defaultSettings };
export type { ShippingRate, StoreSettings };

const NUMBER_KEYS = ["freeShippingThreshold"] as const;
const TEXT_KEYS = ["processingTime", "returnsWindow"] as const;
const JSON_KEYS = ["rates", "countries"] as const;
const ALL_KEYS = [...NUMBER_KEYS, ...TEXT_KEYS, ...JSON_KEYS];

function sanitizeRates(input: unknown): ShippingRate[] {
  if (!Array.isArray(input)) return defaultSettings.rates;
  const out: ShippingRate[] = [];
  for (const raw of input.slice(0, 8)) {
    const r = raw as Record<string, unknown>;
    const name = String(r?.name ?? "").trim().slice(0, 60);
    if (!name) continue;
    const price = Math.max(0, Math.round(Number(r?.price) || 0));
    const minDays = Math.min(60, Math.max(0, Math.round(Number(r?.minDays) || 0)));
    const maxDays = Math.min(90, Math.max(minDays, Math.round(Number(r?.maxDays) || minDays)));
    const id = String(r?.id ?? "").trim().slice(0, 40) || `rate_${out.length + 1}`;
    out.push({ id, name, price, minDays, maxDays });
  }
  return out;
}

function sanitizeCountries(input: unknown): string[] {
  if (!Array.isArray(input)) return defaultSettings.countries;
  return [...new Set(input.map(c => String(c).toUpperCase()).filter(isValidCountry))];
}

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, ALL_KEYS.map(k => `store_${k}`)));
  const map = new Map(rows.map(r => [r.key, r.value]));
  const out: StoreSettings = { ...defaultSettings, rates: [...defaultSettings.rates], countries: [...defaultSettings.countries] };

  const threshold = map.get("store_freeShippingThreshold");
  if (threshold !== undefined && Number.isFinite(Number(threshold))) out.freeShippingThreshold = Math.max(0, Math.round(Number(threshold)));
  for (const key of TEXT_KEYS) { const v = map.get(`store_${key}`); if (v !== undefined) out[key] = v; }
  for (const key of JSON_KEYS) {
    const v = map.get(`store_${key}`);
    if (v === undefined) continue;
    try {
      const parsed = JSON.parse(v);
      if (key === "rates") out.rates = sanitizeRates(parsed);
      else out.countries = sanitizeCountries(parsed);
    } catch { /* keep default */ }
  }
  return out;
}

export async function saveSettings(input: Record<string, unknown>): Promise<StoreSettings> {
  const writes: { key: string; value: string }[] = [];
  if ("freeShippingThreshold" in input) writes.push({ key: "store_freeShippingThreshold", value: String(Math.max(0, Math.round(Number(input.freeShippingThreshold) || 0))) });
  for (const key of TEXT_KEYS) if (key in input) writes.push({ key: `store_${key}`, value: String(input[key] ?? "").slice(0, 200) });
  if ("rates" in input) writes.push({ key: "store_rates", value: JSON.stringify(sanitizeRates(input.rates)) });
  if ("countries" in input) writes.push({ key: "store_countries", value: JSON.stringify(sanitizeCountries(input.countries)) });
  for (const w of writes) {
    await db.insert(siteSettings).values(w).onConflictDoUpdate({ target: siteSettings.key, set: { value: w.value } });
  }
  return getSettings();
}

/** Shipping rates offered for a cart, with free shipping applied when the order qualifies. */
export function ratesForOrder(subtotal: number, allFree: boolean, settings: StoreSettings): ShippingRate[] {
  if (allFree) return [{ id: "free", name: "Free shipping", price: 0, minDays: 3, maxDays: 7 }];
  const qualifies = settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold;
  const rates = settings.rates.length ? settings.rates : defaultSettings.rates;
  if (!qualifies) return rates;
  const cheapest = [...rates].sort((a, b) => a.price - b.price)[0];
  const rest = rates.filter(r => r.id !== cheapest.id);
  return [{ ...cheapest, id: "free", name: "Free shipping", price: 0 }, ...rest];
}