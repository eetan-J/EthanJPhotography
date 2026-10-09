/** All prices are stored as integer cents in Australian dollars. Displays as "A$85". */
export const CURRENCY = "AUD";
export const CURRENCY_LOCALE = "en";

export const formatPrice = (cents: number) => new Intl.NumberFormat(CURRENCY_LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(cents / 100);
