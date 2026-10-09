import { getCatalog } from "@/lib/catalog";
import Storefront from "@/components/storefront";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const products = await getCatalog();
  return <Storefront products={products} />;
}
