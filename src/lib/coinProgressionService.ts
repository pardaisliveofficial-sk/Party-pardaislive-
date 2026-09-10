import { authenticatedFetch } from "./apiClient";

export type CoinSpendSource = "gift" | "party_game" | "pk_match" | "reels_gift" | "transfer" | "other";

export async function recordCoinSpend(
  amount: number,
  source: CoinSpendSource,
  metadata: Record<string, any> = {}
): Promise<any> {
  const resp = await authenticatedFetch("/api/v1/wallet/coin-spend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, source, ...metadata })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Coin transaction could not be saved.");
  return data;
}

export async function recordCreatorEarning(
  amount: number,
  source: string,
  metadata: Record<string, any> = {}
): Promise<any> {
  const resp = await authenticatedFetch("/api/v1/wallet/creator-earning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, source, ...metadata })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || "Creator earning could not be saved.");
  return data;
}
