// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://www.sangham.org';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      // Exclude utility/legal pages from primary crawl priority
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        const url = item.url;

        // Homepage — highest priority, checked weekly
        if (url === `${SITE}/`) {
          return { ...item, changefreq: 'weekly', priority: 1.0 };
        }

        // Primary commercial pages
        if (
          url.startsWith(`${SITE}/counselling`) ||
          url.startsWith(`${SITE}/mentoring-for-young-men`)
        ) {
          return { ...item, changefreq: 'monthly', priority: 0.9 };
        }

        // High-value supporting pages
        if (
          url.startsWith(`${SITE}/about`) ||
          url.startsWith(`${SITE}/contact`) ||
          url.startsWith(`${SITE}/workshops`) ||
          url.startsWith(`${SITE}/practices`)
        ) {
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }

        // Wisdom index — updated as new essays publish
        if (url === `${SITE}/wisdom/`) {
          return { ...item, changefreq: 'weekly', priority: 0.75 };
        }

        // Individual essays and practice guides
        if (url.startsWith(`${SITE}/wisdom/`)) {
          return { ...item, changefreq: 'monthly', priority: 0.65 };
        }

        // Scope and privacy — rarely change
        if (
          url.startsWith(`${SITE}/scope`) ||
          url.startsWith(`${SITE}/privacy`)
        ) {
          return { ...item, changefreq: 'yearly', priority: 0.3 };
        }

        return item;
      },
    }),
  ],
});
