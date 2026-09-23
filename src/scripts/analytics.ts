/**
 * Sangham dataLayer wiring for Google Tag Manager.
 *
 * Conversion elements use explicit data attributes in the rendered HTML.
 * GTM tags, triggers, GA4 key events, and custom dimensions are configured
 * separately in the Google interfaces.
 */

import { clickIds, getAttribution, markReferralLandingView, pushDataLayer } from './tracking';

function populateAttributionFields(): void {
  const attribution = getAttribution();
  const values: Record<string, string> = {
    attribution_utm_source: attribution.utm_source,
    attribution_utm_medium: attribution.utm_medium,
    attribution_utm_campaign: attribution.utm_campaign,
    attribution_utm_content: attribution.utm_content,
    attribution_ref: attribution.ref,
    attribution_initial_landing_page: attribution.initial_landing_page,
    attribution_initial_referrer: attribution.initial_referrer,
  };

  for (const [field, value] of Object.entries(clickIds())) {
    values[`attribution_${field}`] = value;
  }

  for (const [name, value] of Object.entries(values)) {
    document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
      input.value = value;
    });
  }
}

/**
 * Landing pages that paid campaigns point at, as the short codes that appear
 * in a WhatsApp reference. Each campaign has its own destination, so source
 * plus landing page is enough to tell which campaign a lead came from.
 */
const LANDING_CODES: Record<string, string> = {
  '/counselling/cape-town': 'CT',
  '/counselling/workplace-wellbeing': 'WW',
  '/counselling/community-organisations': 'CG',
  '/counselling-for-meditators': 'MD',
  '/mentoring-for-young-men': 'YM',
  '/mentoring-for-adolescents': 'TB',
  '/online-counselling-south-africa': 'OC',
  '/counselling': 'CO',
};

/**
 * A short reference for enquiries from visitors who arrived through a paid ad,
 * for example "G-CT" for Google to the Cape Town page.
 *
 * Most enquiries happen on WhatsApp, and no click identifier survives into a
 * chat, so without this a paid lead cannot be told apart from an organic one.
 * The code is deliberately opaque: it tells Michael the source without telling
 * the visitor they were measured. Organic and direct visitors get no reference.
 */
function paidReference(): string {
  const attribution = getAttribution();
  const ids = clickIds();
  const source = attribution.utm_source.toLowerCase();
  const medium = attribution.utm_medium.toLowerCase();

  let channel = '';
  if (ids.gclid || ids.gbraid || ids.wbraid || (source === 'google' && /cpc|ppc|paid/.test(medium))) {
    channel = 'G';
  } else if (ids.rdt_cid || source === 'reddit') {
    channel = 'R';
  }
  if (!channel) return '';

  const path = attribution.initial_landing_page.replace(/\/+$/, '') || '/';
  return `${channel}-${LANDING_CODES[path] || 'X'}`;
}

/**
 * Append the paid reference to a WhatsApp link's prefilled message, keeping any
 * opening line the page already provides. Runs at click time so it reflects
 * the visitor's first-touch attribution rather than the page's build-time URL.
 */
function tagWhatsAppLink(link: HTMLAnchorElement): string {
  const ref = paidReference();
  if (!ref) return '';

  try {
    const url = new URL(link.href);
    const text = url.searchParams.get('text') || '';
    if (text.includes('(ref ')) return ref;
    // Built by hand: URLSearchParams would encode spaces as "+", which
    // WhatsApp shows literally.
    url.search = `?text=${encodeURIComponent(`${text || 'Hi Michael'} (ref ${ref})`)}`;
    link.href = url.toString();
  } catch {
    // An unparseable link is left exactly as the page rendered it.
  }
  return ref;
}

function getPlacement(element: HTMLElement): string {
  if (element.dataset.placement) return element.dataset.placement;
  if (element.closest('nav')) return 'navigation';
  if (element.closest('footer')) return 'footer';
  return 'inline';
}

function getService(element: HTMLElement): string {
  return element.dataset.service || 'general';
}

function getSection(element: HTMLElement): string {
  if (element.dataset.section) return element.dataset.section;
  const section = element.closest('section');
  const heading = section?.querySelector('h1, h2, h3');
  return heading?.textContent?.trim().slice(0, 80) || 'unknown';
}

markReferralLandingView();
populateAttributionFields();

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const attributedElement = target.closest<HTMLElement>('[data-cta], [data-channel]');
  const contactLink = target.closest<HTMLAnchorElement>('a[href^="mailto:"], a[href*="wa.me/"]');
  const element = attributedElement || contactLink;
  if (!element) return;

  const href = element instanceof HTMLAnchorElement ? element.href : '';
  const channel = element.dataset.channel || (href.startsWith('mailto:') ? 'email' : href.includes('wa.me/') ? 'whatsapp' : '');

  const common = {
    cta_id: element.dataset.cta || '',
    link_text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '',
    destination: href,
    service: getService(element),
    placement: getPlacement(element),
    section: getSection(element),
  };

  if (channel === 'whatsapp') {
    const refCode = contactLink ? tagWhatsAppLink(contactLink) : '';
    pushDataLayer('whatsapp_click', { ...common, ref_code: refCode });
  }

  if (channel === 'email') {
    pushDataLayer('email_click', common);
  }

  switch (element.dataset.cta) {
    case 'book-fit-call':
      pushDataLayer('fit_call_cta_click', common);
      break;
    case 'book-parent-consultation':
      pushDataLayer('parent_consultation_cta_click', common);
      break;
    case 'organisation-enquiry':
      pushDataLayer('organisation_enquiry_click', common);
      break;
    case 'written-enquiry':
      pushDataLayer('written_enquiry_open', common);
      break;
    case 'home-service-router':
      pushDataLayer('home_service_router_click', common);
      break;
    case 'article-service':
      pushDataLayer('article_service_cta_click', common);
      break;
    case 'calendar-fallback':
      pushDataLayer('calendar_fallback_click', common);
      break;
  }

  if (element.dataset.articleService) {
    pushDataLayer('article_service_cta_click', {
      ...common,
      service: element.dataset.articleService,
    });
  }
});

document.querySelectorAll<HTMLDetailsElement>('details').forEach((element) => {
  element.addEventListener('toggle', () => {
    if (!element.open) return;
    const summary = element.querySelector('summary');
    pushDataLayer('faq_expand', {
      question: summary?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 140) || '',
      section: getSection(element),
    });
  });
});

const SCROLL_PAGES = [
  '/',
  '/counselling',
  '/counselling/cape-town',
  '/counselling/community-organisations',
  '/counselling/workplace-wellbeing',
  '/mentoring-for-young-men',
  '/mentoring-for-adolescents',
];
const normalizedPath = window.location.pathname === '/'
  ? '/'
  : window.location.pathname.replace(/\/$/, '');

if (SCROLL_PAGES.includes(normalizedPath)) {
  const thresholds = [25, 50, 75, 90];
  const fired = new Set<number>();

  function checkScroll() {
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (documentHeight <= 0) return;
    const percent = Math.round((window.scrollY / documentHeight) * 100);

    for (const threshold of thresholds) {
      if (percent >= threshold && !fired.has(threshold)) {
        fired.add(threshold);
        pushDataLayer('scroll_depth', { depth_percent: threshold });
      }
    }
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      checkScroll();
      ticking = false;
    });
  }, { passive: true });
}
