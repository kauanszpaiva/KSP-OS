export interface MentionProfile {
  id: string;
  display_name: string;
}

/**
 * Resolve `@handle` tokens in a comment body to profile ids. A handle is a
 * contiguous run of word characters after `@` (no spaces), matched
 * case-insensitively against a profile's first name or compact full display name.
 *
 * Access-impacting mentions fail closed when a token is ambiguous: a first name
 * shared by multiple active profiles grants access to none of them until the
 * author uses a unique compact full name. The author is always excluded.
 */
export function resolveMentions(body: string, profiles: MentionProfile[], authorId?: string): string[] {
  const tokens = [...body.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((match) => match[1].toLowerCase());
  if (tokens.length === 0) return [];

  const ids = new Set<string>();
  for (const token of new Set(tokens)) {
    const matches = profiles.filter((profile) => {
      const displayName = profile.display_name.trim().toLowerCase();
      if (!displayName) return false;
      const first = displayName.split(/\s+/)[0];
      const compact = displayName.replace(/\s+/g, '');
      return token === first || token === compact;
    });
    if (matches.length === 1) ids.add(matches[0].id);
  }

  if (authorId) ids.delete(authorId);
  return [...ids];
}
