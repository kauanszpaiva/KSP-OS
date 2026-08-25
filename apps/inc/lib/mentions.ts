export interface MentionProfile {
  id: string;
  display_name: string;
}

/**
 * Resolve @firstName / @CompactFullName tokens from trusted server-side profiles.
 * A token grants access only when it resolves to exactly one active profile;
 * ambiguous first names fail closed instead of widening access to multiple people.
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
