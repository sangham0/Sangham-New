import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const failures = [];
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function filesUnder(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const filename = path.join(directory, name);
    return statSync(filename).isDirectory()
      ? filesUnder(filename, predicate)
      : predicate(filename) ? [filename] : [];
  });
}

function htmlFor(route) {
  return readFileSync(path.join(dist, route.replace(/^\//, ''), 'index.html'), 'utf8');
}

function attribute(markup, name) {
  const match = markup.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'));
  return match?.[1] || '';
}

assert(existsSync(dist), 'dist/ is missing. Run npm run build first.');

const htmlFiles = filesUnder(dist, (filename) => filename.endsWith('.html'));
const allHtml = htmlFiles.map((filename) => ({ filename, html: readFileSync(filename, 'utf8') }));

for (const { filename, html } of allHtml) {
  for (const match of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    const anchor = match[0];
    const text = anchor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const href = attribute(anchor, 'href');
    if (text.includes('book a free 15-minute fit call')) {
      assert(attribute(anchor, 'data-cta') === 'book-fit-call', `${filename}: fit-call CTA is missing data-cta="book-fit-call"`);
      assert(Boolean(attribute(anchor, 'data-placement')), `${filename}: fit-call CTA is missing data-placement`);
    }
    if (/^(?:\/contact)?#(?:cal-section|cal-inline-embed|fit-cal|cal-fit-embed|book-call)$/.test(href)) {
      assert(attribute(anchor, 'data-cta') === 'book-fit-call', `${filename}: fit-call destination ${href} is missing data-cta="book-fit-call"`);
      assert(Boolean(attribute(anchor, 'data-service')), `${filename}: fit-call destination ${href} is missing data-service`);
      assert(Boolean(attribute(anchor, 'data-placement')), `${filename}: fit-call destination ${href} is missing data-placement`);
    }
  }
}

const previews = [
  {
    route: '/counselling',
    canonical: 'https://www.sangham.org/counselling/',
    image: 'https://www.sangham.org/images/og-counselling.jpg',
    title: 'Online Counselling for Adults | Sangham',
  },
  {
    route: '/counselling-for-meditators',
    canonical: 'https://www.sangham.org/counselling-for-meditators/',
    image: 'https://www.sangham.org/images/og-counselling-for-meditators.jpg',
    title: 'Counselling for Meditators | Sangham',
  },
  {
    route: '/mentoring-for-young-men',
    canonical: 'https://www.sangham.org/mentoring-for-young-men/',
    image: 'https://www.sangham.org/images/og-mentoring-young-men.jpg',
    title: 'Mentoring for Young Men (Ages 18 to 25) | Sangham',
  },
  {
    route: '/mentoring-for-adolescents',
    canonical: 'https://www.sangham.org/mentoring-for-adolescents/',
    image: 'https://www.sangham.org/images/og-mentoring-adolescents.jpg',
    title: 'Mentoring for Teenagers (Ages 12 to 17) | Sangham',
  },
];

for (const preview of previews) {
  const html = htmlFor(preview.route);
  assert(html.includes(`<link rel="canonical" href="${preview.canonical}">`), `${preview.route}: incorrect canonical URL`);
  assert(html.includes(`<meta property="og:url" content="${preview.canonical}">`), `${preview.route}: incorrect og:url`);
  assert(html.includes(`<meta property="og:image" content="${preview.image}">`), `${preview.route}: incorrect og:image`);
  assert(html.includes(`<meta property="og:title" content="${preview.title}">`), `${preview.route}: incorrect og:title`);
  assert(html.includes('<meta property="twitter:card" content="summary_large_image">'), `${preview.route}: missing Twitter large-image card`);
  assert(/<meta property="og:description" content="[^"]+">/.test(html), `${preview.route}: missing og:description`);
}

for (const route of ['/thank-you-fit-call', '/thank-you-enquiry']) {
  const html = htmlFor(route);
  assert(html.includes('<meta name="robots" content="noindex, nofollow">'), `${route}: missing noindex`);
}

const sitemap = filesUnder(dist, (filename) => filename.includes('sitemap') && filename.endsWith('.xml'))
  .map((filename) => readFileSync(filename, 'utf8'))
  .join('\n');
assert(!sitemap.includes('/thank-you-'), 'Confirmation page appears in the sitemap');

const sourceFiles = [
  ...filesUnder(path.join(root, 'src'), (filename) => /\.(astro|ts|md|css)$/.test(filename)),
  ...filesUnder(path.join(root, 'docs'), (filename) => filename.endsWith('.md')),
  ...filesUnder(path.join(root, 'scripts'), (filename) => filename.endsWith('.mjs') && !filename.endsWith('qa-soft-launch.mjs')),
];
const source = sourceFiles.map((filename) => readFileSync(filename, 'utf8')).join('\n');
assert(!source.includes('\u2014'), 'An em dash remains in source or documentation');
assert(!source.match(/action:\s*["']bookingSuccessful["']/), 'Deprecated Cal.com bookingSuccessful event remains');
assert(!source.includes("addEventListener('message'"), 'Generic iframe postMessage booking listener remains');
assert(source.includes('action: "bookingSuccessfulV2"'), 'Current Cal.com bookingSuccessfulV2 listener is missing');
assert(source.includes("gtag('consent', 'update'"), 'Consent preferences do not invoke the gtag command helper');
assert(!source.includes("dataLayer.push('consent', 'update'"), 'Consent update still pushes command arguments separately');

const layoutSource = readFileSync(path.join(root, 'src/layouts/BaseLayout.astro'), 'utf8');
const consentBootstrap = layoutSource.match(/<script is:inline>\s*(window\.dataLayer = window\.dataLayer \|\| \[\];[\s\S]*?)<\/script>/)?.[1] || '';
assert(Boolean(consentBootstrap), 'Consent bootstrap script could not be extracted for scenario tests');

function consentScenario(timeZone, storedConsent = null) {
  const dataLayer = [];
  const storage = storedConsent ? JSON.stringify({ ...storedConsent, ts: Date.now() }) : null;
  const context = {
    window: { dataLayer },
    localStorage: { getItem: () => storage },
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) },
    Date,
    JSON,
  };
  vm.runInNewContext(consentBootstrap, context);
  return {
    commands: dataLayer.map((entry) => Array.from(entry)),
    requiresOptIn: context.window.sanghamRequiresOptIn,
  };
}

if (consentBootstrap) {
  const eea = consentScenario('Europe/Paris');
  assert(eea.requiresOptIn === true, 'EEA timezone does not require analytics opt-in');
  assert(eea.commands[0]?.[0] === 'consent' && eea.commands[0]?.[1] === 'default', 'EEA scenario does not send a consent default command');
  assert(eea.commands[0]?.[2]?.analytics_storage === 'denied', 'EEA analytics storage does not default to denied');
  assert(eea.commands[0]?.[2]?.ad_storage === 'denied', 'EEA advertising storage does not default to denied');

  const nonEea = consentScenario('Africa/Johannesburg');
  assert(nonEea.requiresOptIn === false, 'South African timezone is incorrectly treated as EEA');
  assert(nonEea.commands[0]?.[2]?.analytics_storage === 'granted', 'Non-EEA analytics storage does not use the configured granted default');
  assert(nonEea.commands[0]?.[2]?.ad_storage === 'denied', 'Non-EEA advertising storage does not default to denied');

  const unknown = consentScenario('');
  assert(unknown.requiresOptIn === true, 'Unknown timezone does not use the conservative opt-in default');
  assert(unknown.commands[0]?.[2]?.analytics_storage === 'denied', 'Unknown timezone analytics storage does not default to denied');

  const returning = consentScenario('Europe/Paris', { analytics: true, ad: false });
  assert(returning.commands[1]?.[0] === 'consent' && returning.commands[1]?.[1] === 'update', 'Returning visitor preferences do not send a consent update command');
  assert(returning.commands[1]?.[2]?.analytics_storage === 'granted', 'Stored analytics preference is not restored');
  assert(returning.commands[1]?.[2]?.ad_storage === 'denied', 'Stored advertising preference is not restored');
}

const contactHtml = htmlFor('/contact');
const homeHtml = htmlFor('/');
const writingHtml = htmlFor('/wisdom');
for (const [label, html] of [['contact', contactHtml], ['homepage newsletter', homeHtml], ['writing newsletter', writingHtml]]) {
  for (const field of ['attribution_utm_source', 'attribution_utm_medium', 'attribution_utm_campaign', 'attribution_utm_content', 'attribution_ref', 'attribution_initial_landing_page', 'attribution_initial_referrer']) {
    assert(html.includes(`name="${field}"`), `${label}: missing hidden attribution field ${field}`);
  }
}

const routeFiles = new Set(htmlFiles.map((filename) => path.relative(dist, filename).replace(/\\/g, '/')));
for (const { filename, html } of allHtml) {
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]));
  for (const match of html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["'][^>]*>/gi)) {
    const rawHref = match[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|tel:|javascript:)/i.test(rawHref) || rawHref === '#') continue;
    const url = new URL(rawHref, 'https://www.sangham.org');
    if (url.origin !== 'https://www.sangham.org') continue;

    if (rawHref.startsWith('#')) {
      assert(ids.has(url.hash.slice(1)), `${filename}: missing same-page anchor target ${rawHref}`);
      continue;
    }

    const pathname = url.pathname;
    const target = pathname.endsWith('/')
      ? `${pathname.replace(/^\//, '')}index.html`
      : pathname.includes('.')
        ? pathname.replace(/^\//, '')
        : `${pathname.replace(/^\//, '')}/index.html`;
    assert(routeFiles.has(target) || existsSync(path.join(dist, target)), `${filename}: broken internal link ${rawHref}`);

    if (url.hash && routeFiles.has(target)) {
      const targetHtml = readFileSync(path.join(dist, target), 'utf8');
      assert(new RegExp(`\\sid=["']${url.hash.slice(1)}["']`).test(targetHtml), `${filename}: missing target anchor ${rawHref}`);
    }
  }
}

if (failures.length) {
  console.error(`Soft-launch QA failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Soft-launch QA passed: ${checks} checks across ${htmlFiles.length} HTML pages.`);
