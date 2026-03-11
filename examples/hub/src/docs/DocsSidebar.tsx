import React, { useState, useMemo } from 'react';
import { DOC_SECTIONS } from './manifest';

interface DocsSidebarProps {
  activeSlug: string;
  onNavigate: (slug: string) => void;
}

export const DocsSidebar: React.FC<DocsSidebarProps> = ({ activeSlug, onNavigate }) => {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filteredSections = useMemo(() => {
    if (!search.trim()) return DOC_SECTIONS;
    const q = search.toLowerCase();
    return DOC_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.title.toLowerCase().includes(q)),
    })).filter((section) => section.items.length > 0);
  }, [search]);

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-search-wrap">
        <svg className="docs-sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="docs-sidebar-search"
          type="text"
          placeholder="Search docs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredSections.map((section) => {
        const isCollapsed = collapsed[section.label] ?? false;
        return (
          <div className="docs-section" key={section.label}>
            <button
              className="docs-section-header"
              onClick={() => toggleSection(section.label)}
              aria-expanded={!isCollapsed}
            >
              <svg
                className={`docs-section-chevron ${isCollapsed ? 'collapsed' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>{section.label}</span>
            </button>

            {!isCollapsed && (
              <ul className="docs-section-items">
                {section.items.map((item) => (
                  <li key={item.slug}>
                    <button
                      className={`docs-item ${activeSlug === item.slug ? 'active' : ''}`}
                      onClick={() => onNavigate(item.slug)}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </aside>
  );
};
