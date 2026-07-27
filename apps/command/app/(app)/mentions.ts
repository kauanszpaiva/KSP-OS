export interface MentionProfile {
  id: string;
  display_name: string;
}

/**
 * Resolve `@handle` tokens in a comment body to profile ids. A handle is a
 * contiguous run of word characters after `@` (no spaces), matched
 * case-insensitively against each profile's first name (first token of the
 * display name) or its full display name with spaces removed — so both
 * `@kauan` and `@KauanPaiva` resolve to "Kauan Paiva". Returns unique ids and
 * excludes `authorId` (you never notify yourself for your own mention).
 *
 * This is derived server-side from the stored profile list, never trusted from
 * the client — the comment form only submits free text.
 */
export function resolveMentions(body: string, profiles: MentionProfile[], authorId?: string): string[] {
  const tokens = [...body.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((m) => m[1].toLowerCase());
  if (tokens.length === 0) return [];
  const tokenSet = new Set(tokens);
  const ids = new Set<string>();
  for (const p of profiles) {
    const dn = p.display_name.trim().toLowerCase();
    if (!dn) continue;
    const first = dn.split(/\s+/)[0];
    const compact = dn.replace(/\s+/g, '');
    if (tokenSet.has(first) || tokenSet.has(compact)) ids.add(p.id);
  }
  if (authorId) ids.delete(authorId);
  return [...ids];
}
