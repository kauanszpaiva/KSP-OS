'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icons';

/**
 * Owner navigation.
 *
 * Active state is resolved from the real pathname so the rail can mark the
 * current surface with the Signal Green line/icon cue required by the KSP
 * operating identity. Navigation state is presentation only: it never replaces
 * the server-side owner guard that every INC route already performs.
 */
export type NavLink = { label: string; href: string; icon: IconName };
export type NavSection = { label: string; items: NavLink[] };

/**
 * Picks the single most specific matching route, so `/ai-company` does not look
 * active while the owner is on `/ai-company/communications`.
 */
export function resolveActiveHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter((href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest), matches[0]);
}

function allHrefs(sections: NavSection[]): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.href));
}

/**
 * The router pathname is only available on the client, so the active marker is
 * withheld until after mount. That keeps the server HTML, the hydration render
 * and the settled render consistent instead of briefly marking `Overview` active
 * on every route.
 */
function useActiveHref(sections: NavSection[]): string | null {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !pathname) return null;
  return resolveActiveHref(pathname, allHrefs(sections));
}

export function RailNav({ sections }: { sections: NavSection[] }) {
  const activeHref = useActiveHref(sections);

  return (
    <nav className="railNav" aria-label="KSP INC owner navigation">
      {sections.map((section) => (
        <div className="railGroup" key={section.label}>
          <span className="railGroupLabel">{section.label}</span>
          {section.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <a
                aria-current={active ? 'page' : undefined}
                className={`railLink ${active ? 'railLinkActive' : ''}`}
                href={item.href}
                key={item.href}
              >
                <Icon className="railLinkIcon" name={item.icon} size={18} />
                <span className="railLinkLabel">{item.label}</span>
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const activeHref = useActiveHref(sections);

  return (
    <nav className="mobileNav" aria-label="KSP INC owner navigation">
      {sections.flatMap((section) =>
        section.items.map((item) => {
          const active = item.href === activeHref;
          return (
            <a
              aria-current={active ? 'page' : undefined}
              className={`mobileNavLink ${active ? 'mobileNavLinkActive' : ''}`}
              href={item.href}
              key={item.href}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </a>
          );
        })
      )}
    </nav>
  );
}
