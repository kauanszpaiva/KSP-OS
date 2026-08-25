export interface MentionProfile {
  id: string;
  display_name: string;
}

/** Resolve @firstName / @CompactFullName tokens from trusted server-side profiles. */
export function resolveMentions(body: string, profiles: MentionProfile[], authorId?: string): string[] {
  const tokens = [...body.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((match) => match[1].toLowerCase());
  if (tokens.length === 0) return [];

  const tokenSet = new Set(tokens);
  const ids = new Set<string>();
  for (const profile of profiles) {
    const displayName = profile.display_name.trim().toLowerCase();
    if (!displayName) continue;
    const first = displayName.split(/\s+/)[0];
    const compact = displayName.replace(/\s+/g, '');
    if (tokenSet.has(first) || tokenSet.has(compact)) ids.add(profile.id);
  }
  if (authorId) ids.delete(authorId);
  return [...ids];
}
