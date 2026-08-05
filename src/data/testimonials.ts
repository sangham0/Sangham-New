import { getCollection, type CollectionEntry } from 'astro:content';

export type Testimonial = CollectionEntry<'testimonials'>;

/** Section headings used on /testimonials, in page order. */
export const TESTIMONIAL_CATEGORIES = [
  {
    id: 'individual-work',
    heading: 'Individual work and mentorship',
    intro:
      'Longer relationships, carried over years rather than sessions. These reflections come from one-on-one work and from the families around it.',
  },
  {
    id: 'workshops',
    heading: 'Workshops and group experiences',
    intro:
      'Reflections from people who have practised in a room with others, in workshops and small group sessions.',
  },
  {
    id: 'community',
    heading: 'Community reflections',
    intro:
      'These speak less to a particular service and more to how Michael is with people over time, in ordinary shared life and in groups.',
  },
  {
    id: 'professional-reference',
    heading: 'Professional reference',
    intro: '',
  },
] as const;

export type TestimonialCategory = (typeof TESTIMONIAL_CATEGORIES)[number]['id'];

/**
 * Every testimonial cleared for publication, sorted by `order`.
 *
 * Anything without `permission: granted` is withheld from the build, so a
 * reflection can be drafted in the repository before its approval arrives.
 */
export async function getPublishedTestimonials(): Promise<Testimonial[]> {
  const published = await getCollection(
    'testimonials',
    ({ data }) => data.permission === 'granted',
  );
  return published.sort((a, b) => a.data.order - b.data.order);
}

/**
 * One published testimonial by id (the filename without its extension).
 *
 * Throws at build time if the id is unknown or the person has not granted
 * permission, so a page can never silently lose a quote or publish one early.
 */
export async function getPublishedTestimonial(id: string): Promise<Testimonial> {
  const published = await getPublishedTestimonials();
  const entry = published.find((item) => item.id === id);
  if (!entry) {
    throw new Error(
      `No published testimonial with id "${id}". Check src/content/testimonials/${id}.md exists and has permission: granted.`,
    );
  }
  return entry;
}

/** Published testimonials in one category, sorted by `order`. */
export async function getTestimonialsByCategory(
  category: TestimonialCategory,
): Promise<Testimonial[]> {
  const published = await getPublishedTestimonials();
  return published.filter((item) => item.data.category === category);
}

/**
 * Schema.org Review markup for the named, published testimonials.
 *
 * Deliberately carries no rating: these are written reflections, not scored
 * reviews, and inventing a star value would misrepresent them. Anonymous
 * entries are excluded because a Review needs a real author.
 */
export function testimonialsJsonLd(testimonials: Testimonial[]) {
  return testimonials
    .filter(({ data }) => !data.anonymous)
    .map(({ data, body }) => ({
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@id': 'https://www.sangham.org/#organization' },
      author: { '@type': 'Person', name: data.name },
      reviewBody: (body ?? '').trim(),
      ...(data.professionalReference ? { reviewAspect: 'Professional reference' } : {}),
    }));
}
