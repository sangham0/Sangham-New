// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const SITE = 'https://www.sangham.org';
const LAST_SIGNIFICANT_UPDATE = '2026-07-21';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  adapter: vercel(),
  // Astro's global origin check would 403 provider webhooks (PayFast ITN is
  // form-encoded). Same-origin enforcement is done explicitly per route in
  // src/lib/access.ts (sameOriginOk) for every state-changing endpoint;
  // webhook endpoints are signature-verified instead.
  security: { checkOrigin: false },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      // Exclude error pages and the post-conversion thank-you page
      // (noindexed) from the sitemap.
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/thank-you-'),
      serialize(item) {
        const url = item.url;
        const updatedItem = { ...item, lastmod: LAST_SIGNIFICANT_UPDATE };

        // Homepage: highest priority, checked weekly
        if (url === `${SITE}/`) {
          return { ...updatedItem, changefreq: 'weekly', priority: 1.0 };
        }

        // Primary commercial pages
        if (
          url.startsWith(`${SITE}/counselling`) ||
          url.startsWith(`${SITE}/mentoring-for-young-men`) ||
          url.startsWith(`${SITE}/mentoring-for-adolescents`) ||
          url.startsWith(`${SITE}/online-counselling-south-africa`)
        ) {
          return { ...updatedItem, changefreq: 'monthly', priority: 0.9 };
        }

        // High-value supporting pages
        if (
          url.startsWith(`${SITE}/about`) ||
          url.startsWith(`${SITE}/contact`) ||
          url.startsWith(`${SITE}/workshops`) ||
          url.startsWith(`${SITE}/practices`)
        ) {
          return { ...updatedItem, changefreq: 'monthly', priority: 0.8 };
        }

        // Wisdom index: updated as new essays publish
        if (url === `${SITE}/wisdom/`) {
          return { ...updatedItem, changefreq: 'weekly', priority: 0.75 };
        }

        // Individual essays and practice guides
        if (url.startsWith(`${SITE}/wisdom/`)) {
          return { ...updatedItem, changefreq: 'monthly', priority: 0.65 };
        }

        // Scope and privacy: rarely change
        if (
          url.startsWith(`${SITE}/scope`) ||
          url.startsWith(`${SITE}/privacy`)
        ) {
          return { ...updatedItem, changefreq: 'yearly', priority: 0.3 };
        }

        return updatedItem;
      },
    }),
  ],
});
