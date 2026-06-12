/**
 * Metadata for the three art-directed essays that live as hand-built pages
 * in src/pages/wisdom/ (section dividers, pull-quotes, PDF gates). Their
 * body text lives only in those pages; this file exists so the Writing
 * index can list them without duplicating content.
 */
export interface StaticEssay {
  id: string;
  title: string;
  excerpt: string;
  datePublished: string;
  dateLabel: string;
  /** Filter categories used by the Writing index filter bar. */
  categories: string[];
  readTime: number;
}

export const staticEssays: StaticEssay[] = [
  {
    id: 'kings-and-queens',
    title: 'You Are Not the Beggar You Think You Are',
    excerpt:
      'On the strange dream most people are sleeping inside: the posture of the beggar, and what is waiting underneath it when the performing stops.',
    datePublished: '2026-05-07',
    dateLabel: 'May 2026',
    categories: ['psychology', 'contemplative'],
    readTime: 9,
  },
  {
    id: 'authenticity-as-a-mask',
    title: 'Authenticity as a Mask',
    excerpt:
      'On the people who have made a performance out of being real, and how the ego colonises even the work of unmasking.',
    datePublished: '2026-05-01',
    dateLabel: 'May 2026',
    categories: ['psychology', 'contemplative'],
    readTime: 8,
  },
  {
    id: 'the-art-of-becoming-invisible',
    title: 'The Art of Becoming Invisible',
    excerpt:
      'On the unfashionable wisdom of strategic concealment, and why the wellness world is wrong about always speaking your truth.',
    datePublished: '2026-04-30',
    dateLabel: 'April 2026',
    categories: ['start-here', 'psychology'],
    readTime: 7,
  },
];
