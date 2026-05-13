"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { AboutData } from "@/lib/types";

export default function AboutPage() {
  const [about, setAbout] = useState<AboutData>({
    title: "Обо мне",
    text: "",
    photos: []
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetch("/api/about")
      .then((res) => res.json())
      .then((data) => setAbout(data.about));
  }, []);

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
          <img className="aboutPhoto" src={currentPhoto} alt="Фото автора" />
          <h1>{about.title}</h1>
          <p>{about.text}</p>
        </section>
      </main>
    </>
  );
}
