import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { countryName } from "@/lib/countries";

/** Public shipping info so the bag can show rates and block unsupported destinations. */
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    countries: s.countries.map(code => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name)),
    rates: s.rates,
    freeShippingThreshold: s.freeShippingThreshold,
    processingTime: s.processingTime,
    returnsWindow: s.returnsWindow,
  });
}