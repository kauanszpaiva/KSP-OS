import { describe, expect, it } from 'vitest';
import { resolveMentions, type MentionProfile } from './mentions';

const PROFILES: MentionProfile[] = [
  { id: 'u-kauan', display_name: 'Kauan Paiva' },
  { id: 'u-vanessa', display_name: 'Vanessa' },
  { id: 'u-eric', display_name: 'Eric Souza' }
];

describe('resolveMentions', () => {
  it('returns no ids when the body has no @handles', () => {
    expect(resolveMentions('just a plain comment', PROFILES)).toEqual([]);
  });

  it('matches a first-name handle case-insensitively', () => {
    expect(resolveMentions('hey @kauan can you look?', PROFILES)).toEqual(['u-kauan']);
    expect(resolveMentions('hey @KAUAN', PROFILES)).toEqual(['u-kauan']);
  });

  it('matches a compact full-name handle', () => {
    expect(resolveMentions('cc @KauanPaiva', PROFILES)).toEqual(['u-kauan']);
  });

  it('resolves multiple distinct mentions and de-duplicates repeats', () => {
    const ids = resolveMentions('@eric and @kauan and @eric again', PROFILES);
    expect(ids.sort()).toEqual(['u-eric', 'u-kauan']);
  });

  it('excludes the author from their own mentions', () => {
    expect(resolveMentions('note to @kauan', PROFILES, 'u-kauan')).toEqual([]);
  });

  it('ignores handles that match no profile', () => {
    expect(resolveMentions('@nobody here', PROFILES)).toEqual([]);
  });

  it('fails closed when a first-name mention is ambiguous', () => {
    const profiles = [...PROFILES, { id: 'u-eric-2', display_name: 'Eric Lima' }];
    expect(resolveMentions('@eric please review', profiles)).toEqual([]);
    expect(resolveMentions('@EricSouza please review', profiles)).toEqual(['u-eric']);
  });

  it('does not treat an email address as a mention of a different person', () => {
    // "@eric" inside an email local part still parses as a handle token — but a
    // domain like "acme.com" must not resolve anyone.
    expect(resolveMentions('mail me at hi@acme.com', PROFILES)).toEqual([]);
  });
});
