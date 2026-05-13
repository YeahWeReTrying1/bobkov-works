"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Плавное появление карточки снизу вверх при входе во viewport.
 */
export function CardReveal({ children, className = "", style }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        io.unobserve(el);
      },
      {
        root: null,
        rootMargin: "0px 0px 48px 0px",
        threshold: 0.04
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`cardReveal ${visible ? "cardReveal--visible" : ""} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
