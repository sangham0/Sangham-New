/**
 * Live USD estimates for fixed ZAR prices.
 *
 * Progressive enhancement: elements carry a static fallback like
 * "approx. $45-50 USD" and a `data-usd-from-zar="850"` attribute. When a
 * current ZAR->USD rate can be fetched, the text is replaced with a single
 * up-to-date figure ("approx. $47 USD"). On any failure the static text
 * simply remains, so nothing depends on the rate service.
 *
 * The rate is cached in localStorage for 24 hours, and no network request
 * is made at all on pages without a data-usd-from-zar element.
 */

const STORAGE_KEY = 'sangham_zar_usd';
const TTL_MS = 24 * 60 * 60 * 1000;
const RATE_URL = 'https://open.er-api.com/v6/latest/ZAR';

function cachedRate(): number | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored && typeof stored.rate === 'number' && Date.now() - stored.ts < TTL_MS) {
      return stored.rate;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchRate(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(RATE_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.USD;
    // Sanity bounds: ZAR->USD has lived between ~0.04 and ~0.09 for a decade.
    if (typeof rate !== 'number' || rate < 0.02 || rate > 0.2) return null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rate, ts: Date.now() }));
    } catch {
      /* storage unavailable; still usable this page-view */
    }
    return rate;
  } catch {
    return null;
  }
}

(async () => {
  const els = document.querySelectorAll<HTMLElement>('[data-usd-from-zar]');
  if (els.length === 0) return;

  const rate = cachedRate() ?? (await fetchRate());
  if (!rate) return;

  els.forEach((el) => {
    const zar = Number(el.dataset.usdFromZar);
    if (!Number.isFinite(zar) || zar <= 0) return;
    const usd = Math.round(zar * rate);
    el.textContent = `approx. $${usd} USD`;
    el.title = `Converted from R${zar} at today's exchange rate`;
  });
})();
