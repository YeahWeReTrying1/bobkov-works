"use client";

import { useId, useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  text: string;
};

/** Сколько строк в свёрнутом виде (CSS -webkit-line-clamp). */
const COLLAPSED_LINES = 6;

export function ProjectRichTextCollapse({ text }: Props) {
  const bodyId = useId();
  const innerRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const full = el.scrollHeight;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "0") || 22;
    const approxClampHeight = lineHeight * COLLAPSED_LINES + 2;
    setCanExpand(full > approxClampHeight);
  }, [text]);

  if (!text.trim()) return null;

  const controlId = `${bodyId}-rich`;

  return (
    <div className="projectRichTextWrap">
      <p
        ref={innerRef}
        id={controlId}
        className={`projectRichText ${!expanded && canExpand ? "projectRichText--collapsed" : ""}`}
      >
        {text}
      </p>
      {canExpand ? (
        <button
          type="button"
          className="projectRichTextToggle"
          aria-expanded={expanded}
          aria-controls={controlId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Скрыть" : "Раскрыть"}
        </button>
      ) : null}
    </div>
  );
}
