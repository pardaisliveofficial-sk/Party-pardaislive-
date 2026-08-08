export interface CountryCurrency {
  code: string;
  name: string;
  flag: string;
  currencyCode: string;
  symbol: string;
  pkrRate: number; // How many PKR equal 1 unit of this currency
}

export const COUNTRIES_CURRENCIES: CountryCurrency[] = [
  { code: "PK", name: "Pakistan", flag: "🇵🇰", currencyCode: "PKR", symbol: "Rs ", pkrRate: 1 },
  { code: "US", name: "United States", flag: "🇺🇸", currencyCode: "USD", symbol: "$", pkrRate: 280 },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currencyCode: "SAR", symbol: "SAR ", pkrRate: 74.5 },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currencyCode: "AED", symbol: "AED ", pkrRate: 76 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currencyCode: "GBP", symbol: "£", pkrRate: 355 },
  { code: "EU", name: "European Union", flag: "🇪🇺", currencyCode: "EUR", symbol: "€", pkrRate: 305 },
  { code: "IN", name: "India", flag: "🇮🇳", currencyCode: "INR", symbol: "₹", pkrRate: 3.35 },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", currencyCode: "BDT", symbol: "BDT ", pkrRate: 2.35 },
  { code: "CA", name: "Canada", flag: "🇨🇦", currencyCode: "CAD", symbol: "CA$", pkrRate: 205 },
  { code: "OM", name: "Oman", flag: "🇴🇲", currencyCode: "OMR", symbol: "OMR ", pkrRate: 725 },
  { code: "QA", name: "Qatar", flag: "🇶🇦", currencyCode: "QAR", symbol: "QAR ", pkrRate: 76.5 },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", currencyCode: "KWD", symbol: "KWD ", pkrRate: 910 },
];

/**
 * Core Rule: 1 PKR = 10 Coins (or 10 Coins = 1 PKR)
 * 1,000 Coins = 100 PKR
 * 10,000 Coins = 1,000 PKR
 * 100,000 Coins = 10,000 PKR
 */
export function getCoinsCostInCurrency(
  coins: number,
  country?: CountryCurrency | null,
  discountPercent: number = 0
): { pkrBase: number; localAmount: number; formatted: string; formattedWithCode: string } {
  const safeCountry = (country && country.pkrRate && country.currencyCode) ? country : COUNTRIES_CURRENCIES[0];
  const safeCoins = typeof coins === "number" && !isNaN(coins) ? coins : 0;
  const safeDiscount = typeof discountPercent === "number" && !isNaN(discountPercent) ? discountPercent : 0;

  const basePkrCost = safeCoins / 10;
  const pkrCost = basePkrCost * (1 - safeDiscount / 100);
  const pkrRate = safeCountry.pkrRate || 1;
  const localAmount = pkrCost / pkrRate;

  let formattedNumber = "";
  if (safeCountry.currencyCode === "PKR" || safeCountry.currencyCode === "INR" || safeCountry.currencyCode === "BDT") {
    formattedNumber = localAmount >= 10 ? Math.round(localAmount).toLocaleString() : localAmount.toFixed(1);
  } else if (safeCountry.currencyCode === "OMR" || safeCountry.currencyCode === "KWD") {
    formattedNumber = localAmount.toFixed(3);
  } else {
    formattedNumber = localAmount >= 100 ? Math.round(localAmount).toLocaleString() : localAmount.toFixed(2);
  }

  const symbol = safeCountry.symbol || "";
  const currencyCode = safeCountry.currencyCode || "PKR";

  return {
    pkrBase: pkrCost,
    localAmount,
    formatted: `${symbol}${formattedNumber}`,
    formattedWithCode: `${symbol}${formattedNumber} ${currencyCode}`
  };
}
