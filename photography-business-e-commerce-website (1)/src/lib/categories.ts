import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BASE_CATEGORIES, DIGITAL_CATEGORIES } from "./categories-shared";

export { BASE_CATEGORIES, DIGITAL_CATEGORIES };
const KEY = "custom_categories";

export async function getCategories(): Promise<string[]> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY)).limit(1);
  let custom: string[] = [];
  try { const parsed = JSON.parse(rows[0]?.value || "[]"); if (Array.isArray(parsed)) custom = parsed.map((c: unknown) => String(c)); } catch { /* ignore */ }
  return [...BASE_CATEGORIES, ...custom];
}

export async function getCustomCategories(): Promise<string[]> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY)).limit(1);
  try { const parsed = JSON.parse(rows[0]?.value || "[]"); return Array.isArray(parsed) ? parsed.map((c: unknown) => String(c)) : []; } catch { return []; }
}

export async function addCategory(name: string): Promise<string[]> {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!clean) throw new Error("Give the category a name.");
  if (BASE_CATEGORIES.some(c => c.toLowerCase() === clean.toLowerCase())) throw new Error(`“${clean}” already exists.`);
  const custom = await getCustomCategories();
  if (custom.some(c => c.toLowerCase() === clean.toLowerCase())) throw new Error(`“${clean}” already exists.`);
  if (custom.length >= 20) throw new Error("You can add up to 20 extra categories.");
  await save([...custom, clean]);
  return getCategories();
}

export async function removeCategory(name: string): Promise<string[]> {
  if (BASE_CATEGORIES.includes(name)) throw new Error("Built-in categories can't be removed.");
  const custom = await getCustomCategories();
  await save(custom.filter(c => c.toLowerCase() !== name.toLowerCase()));
  return getCategories();
}

async function save(list: string[]) {
  const value = JSON.stringify(list);
  await db.insert(siteSettings).values({ key: KEY, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value } });
}
