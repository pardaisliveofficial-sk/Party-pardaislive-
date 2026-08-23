/** Deterministic, local avatar fallback using the user's first letter. */
export function getInitialAvatarData(name?: string | null): string {
  const clean = String(name || "U").trim();
  const first = (clean.replace(/^[@#]+/, "").trim().charAt(0) || "U").toUpperCase();
  const safe = first.replace(/[^A-Z0-9]/g, "U");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff007f"/><stop offset="100%" stop-color="#7b2cbf"/></linearGradient></defs><rect width="256" height="256" rx="128" fill="url(#g)"/><text x="128" y="146" text-anchor="middle" font-family="Arial,sans-serif" font-size="118" font-weight="800" fill="#fff">${safe}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
