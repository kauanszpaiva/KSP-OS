'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';

/**
 * Accessible segmented control.
 *
 * Every panel is rendered by the server (so no data is lazily fetched and no
 * authority decision moves into the browser); the tabs only change which panel is
 * visible. Keyboard support follows the WAI-ARIA tabs pattern: left/right/Home/End
 * move selection, and the panel is focusable through its own content.
 */
export type TabItem = {
  id: string;
  label: string;
  icon?: IconName;
  note?: string;
};

export function TabGroup({
  tabs,
  panels,
  label
}: {
  tabs: TabItem[];
  panels: ReactNode[];
  label: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  if (tabs.length === 0) return null;

  const focusTab = (index: number) => {
    const bounded = (index + tabs.length) % tabs.length;
    setActiveIndex(bounded);
    buttons.current[bounded]?.focus();
  };

  return (
    <div className="tabs">
      <div className="tabList" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          return (
            <button
              aria-controls={`${baseId}-panel-${tab.id}`}
              aria-selected={active}
              className={`tab ${active ? 'tabActive' : ''}`}
              id={`${baseId}-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  focusTab(index + 1);
                } else if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  focusTab(index - 1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  focusTab(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  focusTab(tabs.length - 1);
                }
              }}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              role="tab"
              tabIndex={active ? 0 : -1}
              type="button"
            >
              {tab.icon ? <Icon className="tabIcon" name={tab.icon} size={15} /> : null}
              <span>{tab.label}</span>
              {tab.note ? <em className="tabNote tnum">{tab.note}</em> : null}
            </button>
          );
        })}
      </div>
      {panels.map((panel, index) => (
        <div
          aria-labelledby={`${baseId}-tab-${tabs[index].id}`}
          className="tabPanel"
          hidden={index !== activeIndex}
          id={`${baseId}-panel-${tabs[index].id}`}
          key={tabs[index].id}
          role="tabpanel"
          tabIndex={0}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
