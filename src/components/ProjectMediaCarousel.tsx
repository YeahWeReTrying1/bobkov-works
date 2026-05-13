"use client";

import {
  type MouseEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { MediaItem } from "@/lib/types";

const SWIPE_PX = 48;
const LUMA_THRESH = 135;
const EDGE_FRAC = 0.22;

type PointerZone = "left" | "right" | null;

function avgLumaFromImageData(data: ImageData): number {
  let sum = 0;
  const n = data.data.length / 4;
  if (!n) return 255;
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return sum / n;
}

function sampleEdgeFromCanvasSource(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  side: "left" | "right"
): number {
  const canvas = document.createElement("canvas");
  const W = 28;
  const H = 28;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx || !sw || !sh) return 255;
  const sliceW = Math.max(1, Math.floor(sw * EDGE_FRAC));
  const sx = side === "left" ? 0 : sw - sliceW;
  try {
    ctx.drawImage(source, sx, 0, sliceW, sh, 0, 0, W, H);
  } catch {
    return 255;
  }
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, W, H);
  } catch {
    return 255;
  }
  return avgLumaFromImageData(data);
}

function arrowColorFromLuma(luma: number): string {
  return luma > LUMA_THRESH ? "#131313" : "#ffffff";
}

type Props = {
  media: MediaItem[];
  title: string;
};

export function ProjectMediaCarousel({ media, title }: Props) {
  const [index, setIndex] = useState(0);
  const [pointerZone, setPointerZone] = useState<PointerZone>(null);
  const [arrowColors, setArrowColors] = useState({ prev: "#131313", next: "#131313" });
  const touchStartX = useRef<number | null>(null);
  const skipNextViewportClick = useRef(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const total = media.length;
  const normalized = useMemo(() => (total > 0 ? media : []), [media, total]);

  const prev = () => setIndex((current) => (current === 0 ? total - 1 : current - 1));
  const next = () => setIndex((current) => (current === total - 1 ? 0 : current + 1));

  const updateArrowColors = useCallback(() => {
    const root = rootRef.current;
    if (!root || total < 2) return;
    const slide = root.querySelector(
      `.mediaCarouselSlide:nth-child(${index + 1}) .cardMedia`
    ) as HTMLImageElement | HTMLVideoElement | null;
    if (!slide) return;

    if (slide instanceof HTMLImageElement) {
      if (!slide.complete || !slide.naturalWidth) return;
      const lL = sampleEdgeFromCanvasSource(slide, slide.naturalWidth, slide.naturalHeight, "left");
      const lR = sampleEdgeFromCanvasSource(slide, slide.naturalWidth, slide.naturalHeight, "right");
      setArrowColors({
        prev: arrowColorFromLuma(lL),
        next: arrowColorFromLuma(lR)
      });
      return;
    }

    if (slide instanceof HTMLVideoElement) {
      const vw = slide.videoWidth;
      const vh = slide.videoHeight;
      if (!vw || !vh) return;
      const lL = sampleEdgeFromCanvasSource(slide, vw, vh, "left");
      const lR = sampleEdgeFromCanvasSource(slide, vw, vh, "right");
      setArrowColors({
        prev: arrowColorFromLuma(lL),
        next: arrowColorFromLuma(lR)
      });
    }
  }, [index, total]);

  useEffect(() => {
    if (total < 2) return;
    const t = window.setTimeout(updateArrowColors, 0);
    return () => window.clearTimeout(t);
  }, [total, updateArrowColors]);

  useEffect(() => {
    if (total < 2) return;
    thumbRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }, [index, total]);

  useEffect(() => {
    if (total < 2) return;
    const root = rootRef.current;
    if (!root) return;
    const slide = root.querySelector(
      `.mediaCarouselSlide:nth-child(${index + 1}) .cardMedia`
    ) as HTMLVideoElement | null;
    if (!slide || !(slide instanceof HTMLVideoElement)) return;
    slide.addEventListener("timeupdate", updateArrowColors);
    slide.addEventListener("loadeddata", updateArrowColors);
    slide.addEventListener("seeked", updateArrowColors);
    return () => {
      slide.removeEventListener("timeupdate", updateArrowColors);
      slide.removeEventListener("loadeddata", updateArrowColors);
      slide.removeEventListener("seeked", updateArrowColors);
    };
  }, [index, total, updateArrowColors]);

  const onStageMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    setPointerZone(x < r.width / 2 ? "left" : "right");
  };

  const onStageMouseLeave = () => setPointerZone(null);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current == null || total < 2) return;
    const endX = event.changedTouches[0].clientX;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    skipNextViewportClick.current = true;
    window.setTimeout(() => {
      skipNextViewportClick.current = false;
    }, 450);
    if (dx < 0) {
      next();
    } else {
      prev();
    }
  };

  const onViewportClick = (e: MouseEvent<HTMLDivElement>) => {
    if (total < 2 || skipNextViewportClick.current) return;
    const target = e.target;
    if (target instanceof HTMLVideoElement) return;

    const v = e.currentTarget;
    const r = v.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (x < r.width / 2) prev();
    else next();
  };

  const rootClass =
    `mediaCarousel${pointerZone === "left" ? " mediaCarouselPointerLeft" : ""}` +
    `${pointerZone === "right" ? " mediaCarouselPointerRight" : ""}`;

  if (normalized.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className={rootClass} aria-label={`${title} media carousel`}>
      <div
        className="mediaCarouselStage"
        dir="ltr"
        onMouseMove={onStageMouseMove}
        onMouseLeave={onStageMouseLeave}
      >
        {total > 1 ? (
          <button
            className="carouselArrow carouselArrowPrev"
            type="button"
            onClick={prev}
            aria-label="Предыдущий слайд"
            style={{ color: arrowColors.prev }}
          >
            <span className="carouselArrowGlyph carouselArrowGlyphFlip" aria-hidden>
              →
            </span>
          </button>
        ) : null}
        <div
          className="mediaCarouselViewport"
          onClick={onViewportClick}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => {
            touchStartX.current = null;
          }}
        >
          <div className="mediaCarouselTrack" style={{ transform: `translateX(-${index * 100}%)` }}>
            {normalized.map((item) => (
              <div className="mediaCarouselSlide" key={item.id}>
                {item.kind === "video" ? (
                  <video className="cardMedia" src={item.src} controls preload="metadata" />
                ) : (
                  <img
                    className="cardMedia"
                    src={item.src}
                    alt={title}
                    loading="lazy"
                    onLoad={updateArrowColors}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        {total > 1 ? (
          <button
            className="carouselArrow carouselArrowNext"
            type="button"
            onClick={next}
            aria-label="Следующий слайд"
            style={{ color: arrowColors.next }}
          >
            <span className="carouselArrowGlyph" aria-hidden>
              →
            </span>
          </button>
        ) : null}
      </div>
      {total > 1 ? (
        <div className="carouselThumbs" aria-label="Миниатюры слайдов">
          {normalized.map((item, thumbIndex) => (
            <button
              key={item.id}
              type="button"
              ref={(el) => {
                thumbRefs.current[thumbIndex] = el;
              }}
              className={`carouselThumb ${thumbIndex === index ? "isActive" : ""}`}
              onClick={() => setIndex(thumbIndex)}
              aria-label={`Показать слайд ${thumbIndex + 1}`}
              aria-current={thumbIndex === index ? "true" : undefined}
            >
              {item.kind === "video" ? (
                <video
                  className="carouselThumbMedia"
                  src={item.src}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden
                />
              ) : (
                <img className="carouselThumbMedia" src={item.src} alt="" loading="lazy" aria-hidden />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
