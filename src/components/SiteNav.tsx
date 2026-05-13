"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { TAGS } from "@/lib/types";

type Props = {
  showTags?: boolean;
  activeTag?: string;
  tagLeading?: () => ReactNode;
};

export function SiteNav({ showTags = false, activeTag = "flow", tagLeading }: Props) {
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false);
  const panelId = useId();
  const tagMobileRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tagsMenuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      const root = tagMobileRootRef.current;
      if (!root || root.contains(e.target as Node)) return;
      setTagsMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [tagsMenuOpen]);

  const tagLinks = TAGS.map((tag) => (
    <Link
      key={tag}
      className={`tagButton ${activeTag === tag ? "active" : ""}`}
      href={tag === "flow" ? "/" : `/?tag=${encodeURIComponent(tag)}`}
      onClick={() => setTagsMenuOpen(false)}
    >
      {tag === "flow" ? "Flow" : tag}
    </Link>
  ));

  return (
    <header className="topNav">
      <div className="container topNavInner">
        <nav className="topNavLinks">
          <Link href="/" className="topNavLink">
            Работы
          </Link>
          <Link href="/about" className="topNavLink">
            Обо мне
          </Link>
        </nav>
        {showTags ? (
          <>
            <div className="tagRow tagRowDesktop">
              {tagLeading?.()}
              {tagLinks}
            </div>
            <div className="tagNavMobile" ref={tagMobileRootRef}>
              <div className="tagNavMobileBar">
                {tagLeading?.()}
                <button
                  type="button"
                  className="tagNavMobileTrigger"
                  aria-expanded={tagsMenuOpen}
                  aria-controls={panelId}
                  onClick={() => setTagsMenuOpen((o) => !o)}
                >
                  Рубрики
                  <span className="tagNavMobileChevron" aria-hidden>
                    {tagsMenuOpen ? "▴" : "▾"}
                  </span>
                </button>
              </div>
              <div id={panelId} className={`tagNavMobilePanel ${tagsMenuOpen ? "isOpen" : ""}`}>
                <div className="tagNavMobilePanelInner">{tagLinks}</div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
