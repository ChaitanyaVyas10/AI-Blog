import { describe, it, expect } from 'vitest';
import { generateSlug } from '../automation/utilities';

describe('slug generation', () => {
  it('generates a consistent slug with date', () => {
    const s = generateSlug('Why the Latest AI Regulation Matters', '2026-09-14');
    expect(s).toBe('2026-09-14/why-the-latest-ai-regulation-matters');
  });
});
