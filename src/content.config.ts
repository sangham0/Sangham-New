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

/**
 * Testimonials: the single canonical source for every reflection published on
 * the site. One file per person in src/content/testimonials/; the filename is
 * the internal id. The markdown body holds the full approved text; `excerpt`,
 * `cardQuote`, and `pullQuote` hold the shorter forms that service pages reuse
 * so that no page carries its own private copy of someone's words.
 *
 * Nothing renders unless `permission: granted`. See docs/testimonials.md for
 * how to add a new person.
 *
 * Internal-only fields (`sourceNote`, `sensitivityNote`) are editorial notes for
 * whoever maintains the content. They are never rendered into HTML.
 */
const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
  schema: ({ image }) =>
    z.object({
      /** Public display name, exactly as it should appear in the attribution. */
      name: z.string(),
      /** Relationship context shown beneath the name, e.g. "Workshop participant". */
      attribution: z.string(),
      /** Small uppercase eyebrow above the quote, e.g. "Professional Reflection". */
      label: z.string(),
      /** Which section of /testimonials the person belongs to. */
      category: z.enum([
        'individual-work',
        'workshops',
        'community',
        'professional-reference',
      ]),
      /** Paragraphs used in standard testimonial cards across the site. */
      excerpt: z.array(z.string()).default([]),
      /** Single condensed paragraph for compact card slots (three-up grids). */
      cardQuote: z.string().optional(),
      /** Single passage used for inline editorial pull-quotes. */
      pullQuote: z.string().optional(),
      portrait: image().optional(),
      portraitAlt: z.string().optional(),
      /** CSS object-position for the portrait crop, tuned per photograph. */
      portraitPosition: z.string().default('center'),
      /** True when the person is published without a name or portrait. */
      anonymous: z.boolean().default(false),
      /** True for professional references, which get a distinct treatment. */
      professionalReference: z.boolean().default(false),
      /** Site paths this reflection is relevant to. */
      services: z.array(z.string()).default([]),
      /** Featured reflections open /testimonials as a longer editorial story. */
      featured: z.boolean().default(false),
      /** Only `granted` is ever rendered. */
      permission: z.enum(['granted', 'pending']).default('pending'),
      /** Visible framing note rendered alongside the reflection. */
      contextNote: z.string().optional(),
      /** Internal: where the canonical wording came from. Never rendered. */
      sourceNote: z.string().optional(),
      /** Internal: handling notes for sensitive material. Never rendered. */
      sensitivityNote: z.string().optional(),
      /** Sort order within a category. Lower appears first. */
      order: z.number().default(100),
    }),
});

export const collections = { writing, testimonials };
