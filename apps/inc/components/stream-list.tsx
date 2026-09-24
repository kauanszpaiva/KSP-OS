'use client';

import { useMemo, useState } from 'react';
import type { ListRow } from '../lib/inc-data';
import { riseDelay, statusTone } from '../lib/visual-data';
import { Icon, type IconName } from './icons';

/**
 * Filterable owner stream.
 *
 * Rows arrive already fetched by the server guard and are only filtered,
 * searched and progressively disclosed in the browser. Filtering a visible list
 * is presentation, never authorization: every row here was already returned
 * under the same RLS boundary the page used before this component existed.
 */
export type StreamFacet = {
  id: string;
  label: string;
  /** `ListRow.group` values this facet accepts. Omit to accept every row. */
  groups?: string[];
  /** `ListRow.status` values this facet accepts. Omit to accept every row. */
  statuses?: string[];
  icon?: IconName;
};

const GROUP_ICON: Record<string, IconName> = {
  task: 'layers',
  invoice: 'banknote',
  approval: 'shield',
  subscription: 'database',
  unit: 'sitemap',
  permission: 'key',
  temporary: 'clock',
  membership: 'users',
  client: 'briefcase',
  partner: 'globe',
  audit: 'history',
  other: 'pulse'
};

function iconFor(row: ListRow): IconName {
  return GROUP_ICON[row.group ?? 'other'] ?? 'pulse';
}

export function StreamList({
  rows,
  empty,
  facets,
  searchable = true,
  searchPlaceholder = 'Search rows',
  pageSize = 18
}: {
  rows: ListRow[];
  empty: string;
  facets?: StreamFacet[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
}) {
  const [activeFacet, setActiveFacet] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const matches = useMemo(
    () => (facet: StreamFacet, row: ListRow) => {
      if (facet.groups && !facet.groups.includes(row.group ?? 'other')) return false;
      if (facet.statuses && !facet.statuses.includes((row.status ?? '').toLowerCase())) return false;
      return true;
    },
    []
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const facet of facets ?? []) {
      map.set(facet.id, rows.filter((row) => matches(facet, row)).length);
    }
    return map;
  }, [facets, matches, rows]);

  const filtered = useMemo(() => {
    const facet = (facets ?? []).find((item) => item.id === activeFacet);
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (facet && !matches(facet, row)) return false;
      if (needle.length === 0) return true;
      return `${row.primary} ${row.secondary} ${row.meta ?? ''} ${row.group ?? ''}`
        .toLowerCase()
        .includes(needle);
    });
  }, [activeFacet, facets, matches, query, rows]);

  if (rows.length === 0) {
    return <div className="emptyPanel">{empty}</div>;
  }

  const visible = expanded ? filtered : filtered.slice(0, pageSize);
  const hidden = filtered.length - visible.length;

  return (
    <div className="stream">
      {facets && facets.length > 1 || searchable ? (
        <div className="streamToolbar">
          {facets && facets.length > 1 ? (
            <div className="chipRow" role="group" aria-label="Filter rows">
              <button
                aria-pressed={activeFacet === 'all'}
                className={`chip ${activeFacet === 'all' ? 'chipActive' : ''}`}
                onClick={() => {
                  setActiveFacet('all');
                  setExpanded(false);
                }}
                type="button"
              >
                All
                <em className="tnum">{rows.length}</em>
              </button>
              {facets.map((facet) => (
                <button
                  aria-pressed={activeFacet === facet.id}
                  className={`chip ${activeFacet === facet.id ? 'chipActive' : ''}`}
                  key={facet.id}
                  onClick={() => {
                    setActiveFacet(facet.id);
                    setExpanded(false);
                  }}
                  type="button"
                >
                  {facet.icon ? <Icon name={facet.icon} size={13} /> : null}
                  {facet.label}
                  <em className="tnum">{counts.get(facet.id) ?? 0}</em>
                </button>
              ))}
            </div>
          ) : null}
          {searchable ? (
            <label className="streamSearch">
              <Icon name="search" size={15} />
              <span className="srOnly">Search rows</span>
              <input
                onChange={(event) => {
                  setQuery(event.target.value);
                  setExpanded(false);
                }}
                placeholder={searchPlaceholder}
                type="search"
                value={query}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <p className="streamCount" aria-live="polite">
        Showing <strong className="tnum">{visible.length}</strong> of{' '}
        <strong className="tnum">{filtered.length}</strong> returned rows
        {filtered.length !== rows.length ? ` (${rows.length} in this environment)` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="emptyPanel">No rows match this filter or search in the returned window.</div>
      ) : (
        <div className="ownerList">
          {visible.map((row, index) => (
            <article className="ownerListRow streamRow rise" key={row.id} style={riseDelay(index, 24)}>
              <span className={`rowIcon ${row.status ? `tone${statusTone(row.status)}` : 'toneNeutral'}`}>
                <Icon name={iconFor(row)} size={16} />
              </span>
              <div className="rowBody">
                <strong>{row.primary}</strong>
                <span>{row.secondary}</span>
              </div>
              {row.meta ? <small className="rowMeta">{row.meta}</small> : null}
            </article>
          ))}
        </div>
      )}

      {hidden > 0 || expanded ? (
        <div className="streamMore">
          <button
            className="ghostButton"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            <Icon name="chevron-down" size={15} />
            {expanded ? 'Collapse to first rows' : `Show ${hidden} more`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
