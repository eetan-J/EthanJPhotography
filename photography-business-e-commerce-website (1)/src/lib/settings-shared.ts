/** Client-safe settings types and defaults — no database imports here. */

export type ShippingRate = { id: string; name: string; price: number; minDays: number; maxDays: number };

export type StoreSettings = {
  freeShippingThreshold: number;
  processingTime: string;
  returnsWindow: string;
  rates: ShippingRate[];
  countries: string[];
};

export const defaultSettings: StoreSettings = {
  freeShippingThreshold: 15000,
  processingTime: "Ships in 3–5 business days",
  returnsWindow: "30-day free returns",
  rates: [
    { id: "standard", name: "Standard shipping", price: 900, minDays: 3, maxDays: 7 },
    { id: "express", name: "Express shipping", price: 2200, minDays: 1, maxDays: 3 },
  ],
  countries: ["US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL"],
};
