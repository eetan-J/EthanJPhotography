import { db } from "@/db";
import { products, siteSettings } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

const photo = (id: number, width = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

const starterProducts = [
  { name: "Where the Mountains Breathe", slug: "where-the-mountains-breathe", category: "Prints", location: "Scottish Highlands", description: "A quiet study of mist, mountain and reflection. Printed on archival fine art paper to preserve every subtle tone and detail.", imageUrl: photo(1442486), price: 8500, inventory: 25, featured: true },
  { name: "The Space Between", slug: "the-space-between", category: "Framed Prints", location: "Dolomites, Italy", description: "A moment of stillness in the mountains, finished with a timeless gallery-quality frame. Made to bring a little of the outside in.", imageUrl: photo(29353713), price: 24500, inventory: 12, featured: true },
  { name: "Golden Hour, Slowly", slug: "golden-hour-slowly", category: "Prints", location: "Great Sand Dunes, Colorado", description: "Sculptural dunes catching the last warm light of day. An open invitation to slow down and look closer.", imageUrl: photo(28639305), price: 9500, inventory: 20, featured: true },
  { name: "Quiet Waters", slug: "quiet-waters", category: "Framed Prints", location: "West Coast, Ireland", description: "A soft mountain mirrored in the water beneath a veil of morning mist. An enduring piece for contemplative spaces.", imageUrl: photo(38153504), price: 26500, inventory: 10, featured: true },
  { name: "Wild Places: Volume One", slug: "wild-places-volume-one", category: "Photobooks", location: "Collected journeys", description: "A thoughtfully designed coffee table book of landscapes, little moments, and stories from the road. Hardcover, 120 pages.", imageUrl: photo(10807706), price: 6800, inventory: 40, featured: false },
  { name: "The Wandering Collection", slug: "the-wandering-collection", category: "Wallpapers", location: "Digital collection", description: "Bring the outdoors to your everyday. A curated set of 12 high-resolution desktop and mobile wallpapers delivered digitally.", imageUrl: photo(25975000), price: 1800, inventory: null, featured: false },
  { name: "Earth & Light Presets", slug: "earth-and-light-presets", category: "Presets", location: "Digital collection", description: "The tones behind the photographs. Six versatile Lightroom presets made for warm highlights, rich shadows, and natural color.", imageUrl: photo(30779207), price: 2900, inventory: null, featured: false },
  { name: "A Little More Light", slug: "a-little-more-light", category: "Prints", location: "Lake District, England", description: "An early morning on the water, where the world felt wonderfully still. Museum-quality print on textured archival paper.", imageUrl: photo(20344851), price: 8500, inventory: 18, featured: false },
];

const sizeDefaults: Record<string, { label: string; price: number }[]> = {
  Prints: [{ label: "12×16 in", price: 6500 }, { label: "18×24 in", price: 9500 }, { label: "24×32 in", price: 13500 }, { label: "30×40 in", price: 18500 }],
  "Framed Prints": [{ label: "12×16 in", price: 14500 }, { label: "18×24 in", price: 21500 }, { label: "24×32 in", price: 31000 }, { label: "30×40 in", price: 42000 }],
  Photobooks: [{ label: "8×10 in", price: 5200 }, { label: "10×10 in", price: 6800 }, { label: "12×12 in", price: 9200 }, { label: "14×14 in", price: 12000 }],
};

const finishDefaults: Record<string, string[]> = {
  "Framed Prints": ["Natural Oak", "Matte Black", "Gallery White"],
  Photobooks: ["Matte cover", "Gloss cover"],
};

export async function getCatalog() {
  const marker = await db.select().from(siteSettings).where(eq(siteSettings.key, "catalog_seeded")).limit(1);
  if (!marker.length) {
    await db.insert(siteSettings).values({ key: "catalog_seeded", value: "yes" }).onConflictDoNothing();
    await db.insert(products).values(starterProducts).onConflictDoNothing();
  }
  for (const [category, options] of Object.entries(sizeDefaults)) {
    await db.update(products).set({ sizeOptions: options }).where(and(eq(products.category, category), isNull(products.sizeOptions)));
  }
  for (const [category, options] of Object.entries(finishDefaults)) {
    await db.update(products).set({ finishOptions: options }).where(and(eq(products.category, category), isNull(products.finishOptions)));
  }
  return db.select().from(products).where(eq(products.active, true)).orderBy(desc(products.featured), desc(products.createdAt));
}