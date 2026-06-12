import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The Writing library (essays + practice guides), published as markdown.
 * One file per piece in src/content/writing/; the filename is the URL slug
 * under /wisdom/. Set `draft: true` to keep a piece out of the build.
 *
 * The three art-directed essays (kings-and-queens, authenticity-as-a-mask,
 * the-art-of-becoming-invisible) live as hand-built pages in
 * src/pages/wisdom/ with their metadata in src/data/static-essays.ts.
 */
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    publishedDate: z.coerce.date(),
    /** Human-readable date shown on cards and essay headers, e.g. "April 2026". */
    dateLabel: z.string(),
    category: z.enum(['essay', 'practice-guide']).default('essay'),
    tags: z.array(z.string()).default([]),
    /** Filter categories used by the Writing index filter bar. */
    categories: z.array(z.string()).default([]),
    /** Earlier writings from traditional training years; rendered in the
     *  "From the Contemplative Notebooks" section with a framing note. */
    notebook: z.boolean().default(false),
    /** Drafts are excluded from the build, the index, and the sitemap. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing };
