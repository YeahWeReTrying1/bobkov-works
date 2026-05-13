"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { withBasePath } from "@/lib/sitePath";
import type { AboutData } from "@/lib/types";

type Props = {
  about: AboutData;
};

export function AboutContent({ about }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const value = max <= 0 ? 0 : window.scrollY / max;
      setProgress(value);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentPhoto = useMemo(() => {
    if (!about.photos.length) {
      return "/placeholder.svg";
    }
    const idx = Math.min(
      about.photos.length - 1,
      Math.floor(progress * about.photos.length)
    );
    return about.photos[idx];
  }, [about.photos, progress]);

  return (
    <>
      <SiteNav />
      <main className="aboutWrap">
        <section className="aboutInner">
          <img className="aboutPhoto" src={withBasePath(currentPhoto)} alt="Фото автора" />
          <h1>{about.title}</h1>
          <p>{about.text}</p>
        </section>
      </main>
    </>
  );
}
