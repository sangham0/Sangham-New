/**
 * Sangham — dataLayer event wiring for GTM
 *
 * This file pushes structured events to window.dataLayer.
 * GTM tags/triggers are configured separately in the GTM UI.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

window.dataLayer = window.dataLayer || [];

function push(event: string, extra: Record<string, unknown> = {}) {
  window.dataLayer.push({
    event,
    page_path: window.location.pathname,
    ...extra,
  });
}

// ────────────────────────────────────────────────────────────
// 5.2  CTA Click Events
// ────────────────────────────────────────────────────────────

function getPlacement(el: Element): string {
  if (el.closest('nav, [class*="fixed"]')) return 'header';
  if (el.closest('footer')) return 'footer';
  if (el.closest('[class*="sticky"], [class*="Sticky"]')) return 'sticky';
  if (el.closest('[id*="cal"], [class*="cal"]')) return 'cta_block';
  return 'inline';
}

function getSection(el: Element): string {
  const section = el.closest('section');
  if (!section) return 'unknown';
  const h = section.querySelector('h1, h2, h3');
  return h?.textContent?.trim().substring(0, 50) ?? 'unknown';
}

// Book-a-call buttons
document.querySelectorAll('a[href*="#book-call"], a[href*="#fit-cal"], a[href*="#cal-fit"], a[href*="fit-call"], button[data-cta*="book"]').forEach(el => {
  el.setAttribute('data-cta', el.getAttribute('data-cta') || 'book-call');
  el.addEventListener('click', () => {
    push('cta_book_call_click', {
      button_text: el.textContent?.trim(),
      section: getSection(el),
      placement: getPlacement(el),
    });
  });
});

// Parent consultation buttons
document.querySelectorAll('a[href*="#parental-cal"], a[href*="parent-consultation"], button[data-cta*="parent"]').forEach(el => {
  el.setAttribute('data-cta', el.getAttribute('data-cta') || 'parent-consultation');
  el.addEventListener('click', () => {
    push('cta_parent_consultation_click', {
      button_text: el.textContent?.trim(),
      section: getSection(el),
      placement: getPlacement(el),
    });
  });
});

// WhatsApp clicks
document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
  el.setAttribute('data-cta', el.getAttribute('data-cta') || 'whatsapp');
  el.addEventListener('click', () => {
    push('whatsapp_click', {
      button_text: el.textContent?.trim() || 'WhatsApp',
      section: getSection(el),
      placement: getPlacement(el),
    });
  });
});

// Email clicks
document.querySelectorAll('a[href*="mailto:ramarishi@sangham.org"]').forEach(el => {
  el.setAttribute('data-cta', el.getAttribute('data-cta') || 'email');
  el.addEventListener('click', () => {
    push('email_click', {
      button_text: el.textContent?.trim(),
      section: getSection(el),
      placement: getPlacement(el),
    });
  });
});

// FAQ accordion expand
document.querySelectorAll('details, [data-accordion], button[aria-expanded]').forEach(el => {
  const handler = () => {
    const isOpening = el instanceof HTMLDetailsElement
      ? el.open
      : el.getAttribute('aria-expanded') === 'true';
    if (isOpening) {
      const questionEl = el.querySelector('summary, [data-accordion-title], h3, h4') || el;
      push('faq_expand', {
        button_text: questionEl.textContent?.trim().substring(0, 100),
        section: getSection(el),
        placement: 'inline',
      });
    }
  };
  if (el instanceof HTMLDetailsElement) {
    el.addEventListener('toggle', handler);
  } else {
    el.addEventListener('click', handler);
  }
});

// Secondary CTAs (About Michael, Read more, Full scope and ethics)
document.querySelectorAll('a[data-cta="secondary"], a[href="/about"], a[href="/scope"]').forEach(el => {
  const text = el.textContent?.trim().toLowerCase() ?? '';
  if (text.includes('about michael') || text.includes('read more') || text.includes('scope') || text.includes('learn more')) {
    el.setAttribute('data-cta', 'secondary');
    el.addEventListener('click', () => {
      push('secondary_cta_click', {
        button_text: el.textContent?.trim(),
        section: getSection(el),
        placement: getPlacement(el),
      });
    });
  }
});

// Contact form submit
document.querySelectorAll('form[action*="formspree"]').forEach(form => {
  form.addEventListener('submit', () => {
    push('contact_form_submit', {
      button_text: 'Submit',
      section: getSection(form),
      placement: 'inline',
    });
  });
});

// Newsletter subscribe
document.querySelectorAll('form[data-newsletter], form[action*="newsletter"]').forEach(form => {
  form.addEventListener('submit', () => {
    push('newsletter_subscribe', {
      button_text: 'Subscribe',
      section: getSection(form),
      placement: 'inline',
    });
  });
});

// ────────────────────────────────────────────────────────────
// 5.3  Scroll Depth Tracking
// ────────────────────────────────────────────────────────────

const SCROLL_PAGES = ['/', '/counselling', '/mentoring-for-young-men', '/mentoring-for-adolescents'];

if (SCROLL_PAGES.includes(window.location.pathname)) {
  const thresholds = [25, 50, 75, 90];
  const fired = new Set<number>();

  function checkScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const pct = Math.round((scrollTop / docHeight) * 100);

    for (const t of thresholds) {
      if (pct >= t && !fired.has(t)) {
        fired.add(t);
        push('scroll_depth', { depth_percent: t });
      }
    }
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { checkScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
}

// ────────────────────────────────────────────────────────────
// 5.4  Cal.com Booking Conversion Tracking
// ────────────────────────────────────────────────────────────

window.addEventListener('message', (e) => {
  // Cal.com sends postMessage events from its iframe
  if (!e.data || typeof e.data !== 'object') return;

  // Cal.com v2 embed events use { type: "CAL:..." } shape
  const calType: string = e.data.type || '';

  if (calType === 'CAL:bookingSuccessful' || calType === '__routeChanged') {
    // Try to determine booking type from the current page or embed namespace
    let bookingType = 'individual';
    const path = window.location.pathname;
    if (path.includes('adolescents')) {
      bookingType = 'parent-consultation';
    } else if (path.includes('young-men')) {
      bookingType = 'fit-call';
    }

    // Also check for Cal namespace in the event data
    const ns: string = e.data.namespace || e.data.data?.namespace || '';
    if (ns.includes('parent') || ns.includes('parental')) {
      bookingType = 'parent-consultation';
    } else if (ns.includes('fit')) {
      bookingType = 'fit-call';
    }

    if (calType === 'CAL:bookingSuccessful') {
      push('cal_booking_confirmed', { booking_type: bookingType });
    }
  }
});
