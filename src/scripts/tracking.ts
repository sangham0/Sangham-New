export interface AttributionData {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  ref: string;
  initial_landing_page: string;
  initial_referrer: string;
  /**
   * Ad-platform click identifiers, captured first-touch alongside the UTMs.
   *
   * Optional because a session stored before these were captured still
   * deserialises into this shape. Read them through `clickIds()`, never
   * directly, so a partial stored object cannot produce `undefined` in a
   * form field or a dataLayer payload.
   */
  click_ids?: Partial<Record<ClickIdField, string>>;
  captured_at?: string;
}

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

const ATTRIBUTION_KEY = 'sangham_attribution';
const ATTRIBUTION_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'] as const;

/**
 * Click identifiers the ad platforms append to a landing URL.
 *
 * These are opaque advertising tokens, not personal data: no name, email,
 * phone number, enquiry text, symptom, or booking detail is ever stored or
 * emitted here. They exist so a lead can later be reconciled with the click
 * that produced it, which is what an offline qualified-lead or new-client
 * import needs. Retention follows the session: sessionStorage only, cleared
 * when the browser session ends.
 */
const CLICK_ID_FIELDS = [
  'gclid',
  'gbraid',
  'wbraid',
  'gad_source',
  'gad_campaignid',
  'gad_adgroupid',
  'rdt_cid',
  'msclkid',
  'fbclid',
] as const;

export type ClickIdField = (typeof CLICK_ID_FIELDS)[number];

function clean(value: string | null, maxLength = 120): string {
  return (value || '').trim().replace(/[\r\n\t]/g, ' ').slice(0, maxLength);
}

/** Click identifiers are longer and more punctuated than a UTM value. */
function cleanToken(value: string | null): string {
  return (value || '').trim().replace(/[^\w.~-]/g, '').slice(0, 400);
}

/**
 * Stored click identifiers, always a complete record with empty strings for
 * anything absent, so callers never have to guard against a partial object.
 */
export function clickIds(): Record<ClickIdField, string> {
  const stored = getAttribution().click_ids || {};
  const result = {} as Record<ClickIdField, string>;
  for (const field of CLICK_ID_FIELDS) {
    result[field] = stored[field] || '';
  }
  return result;
}

/** True when any ad-platform click identifier was captured this session. */
export function hasClickId(): boolean {
  return Object.values(clickIds()).some(Boolean);
}

function safeReferrer(): string {
  if (!document.referrer) return '';

  try {
    const url = new URL(document.referrer);
    return `${url.origin}${url.pathname}`.slice(0, 240);
  } catch {
    return '';
  }
}

function readStoredAttribution(): AttributionData | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return null;
    return stored as AttributionData;
  } catch {
    return null;
  }
}

export function captureAttribution(): AttributionData {
  const existing = readStoredAttribution();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);

  const capturedClickIds: Partial<Record<ClickIdField, string>> = {};
  for (const field of CLICK_ID_FIELDS) {
    const value = cleanToken(params.get(field));
    if (value) capturedClickIds[field] = value;
  }

  const attribution: AttributionData = {
    utm_source: clean(params.get('utm_source')),
    utm_medium: clean(params.get('utm_medium')),
    utm_campaign: clean(params.get('utm_campaign')),
    utm_content: clean(params.get('utm_content')),
    ref: clean(params.get('ref')),
    initial_landing_page: window.location.pathname,
    initial_referrer: safeReferrer(),
    click_ids: capturedClickIds,
    captured_at: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution remains available in memory for the current page.
  }

  return attribution;
}

export function getAttribution(): AttributionData {
  return readStoredAttribution() || captureAttribution();
}

export function attributionEventParameters(): Record<string, string> {
  const attribution = getAttribution();
  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    referral_code: attribution.ref,
    initial_landing_page: attribution.initial_landing_page,
    initial_referrer: attribution.initial_referrer,
    ...clickIds(),
  };
}

export function pushDataLayer(event: string, extra: Record<string, unknown> = {}): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    page_path: window.location.pathname,
    ...attributionEventParameters(),
    ...extra,
  });
}

export function appendAttribution(data: FormData): FormData {
  const attribution = getAttribution();

  for (const field of ATTRIBUTION_FIELDS) {
    data.set(`attribution_${field}`, attribution[field]);
  }

  data.set('attribution_initial_landing_page', attribution.initial_landing_page);
  data.set('attribution_initial_referrer', attribution.initial_referrer);

  // Click identifiers travel with the enquiry so a lead can be reconciled with
  // the click that produced it. Empty ones are omitted rather than sent blank.
  for (const [field, value] of Object.entries(clickIds())) {
    if (value) data.set(`attribution_${field}`, value);
  }

  data.set('submission_page_path', window.location.pathname);
  return data;
}

export function hasReferralParameters(): boolean {
  const params = new URLSearchParams(window.location.search);
  return ATTRIBUTION_FIELDS.some((field) => Boolean(clean(params.get(field))));
}

export function markReferralLandingView(): void {
  if (!hasReferralParameters()) return;

  const params = new URLSearchParams(window.location.search);
  const signature = `${window.location.pathname}?${ATTRIBUTION_FIELDS.map((field) => `${field}=${clean(params.get(field))}`).join('&')}`;
  const key = `sangham_referral_view:${signature}`;

  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // If storage is unavailable, allow the event to be sent once on this load.
  }

  pushDataLayer('referral_landing_view', {
    landing_page: window.location.pathname,
  });
}

export function storePendingConversion(key: string, payload: Record<string, unknown>): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    // A confirmation page still renders if storage is unavailable.
    return false;
  }
}

export function consumePendingConversion(key: string): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
