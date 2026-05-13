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
import { CardReveal } from "@/components/CardReveal";
import { withBasePath } from "@/lib/sitePath";
import { MediaItem } from "@/lib/types";

const LIGHTBOX_SWIPE_PX = 56;

type Props = {
  media: MediaItem[];
  title: string;
};

type OrientationMap = Record<string, "landscape" | "other">;
type Rect = { top: number; left: number; width: number; height: number };
type ZoomState = {
  open: boolean;
  index: number;
  sourceId: string;
  rect: Rect;
  opacity: number;
  closing: boolean;
};

function fitIntoViewport(width: number, height: number, padding = 24): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = Math.max(100, vw - padding * 2);
  const maxH = Math.max(100, vh - padding * 2);
  const ratio = Math.min(maxW / width, maxH / height, 1);
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);
  return {
    left: Math.round((vw - w) / 2),
    top: Math.round((vh - h) / 2),
    width: w,
    height: h
  };
}

export function ProjectMediaGrid({ media, title }: Props) {
  const [orientations, setOrientations] = useState<OrientationMap>({});
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const lightboxTouchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressBackdropClickRef = useRef(false);
  const lightboxSkipNextRefitRef = useRef(true);

  const imageItems = useMemo(
    () =>
      media
        .filter((item) => item.kind !== "video")
        .map((item) => ({ id: item.id, src: item.src, alt: item.caption || title })),
    [media, title]
  );

  const setOrientation = (id: string, width: number, height: number) => {
    if (!width || !height) return;
    const value: "landscape" | "other" = width > height ? "landscape" : "other";
    setOrientations((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
  };

  const getThumbRect = (id: string): Rect | null => {
    const el = document.querySelector(`[data-zoom-id="${id}"] img`) as HTMLImageElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };

  const openZoom = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    const img = event.currentTarget.querySelector("img");
    if (!img) return;
    const startRect = img.getBoundingClientRect();
    const openIndex = imageItems.findIndex((item) => item.id === id);
    if (openIndex < 0) return;

    const naturalWidth = img.naturalWidth || startRect.width;
    const naturalHeight = img.naturalHeight || startRect.height;
    const targetRect = fitIntoViewport(naturalWidth, naturalHeight, 24);

    setZoom({
      open: true,
      index: openIndex,
      sourceId: id,
      rect: {
        top: startRect.top,
        left: startRect.left,
        width: startRect.width,
        height: startRect.height
      },
      opacity: 1,
      closing: false
    });

    requestAnimationFrame(() => {
      setZoom((prev) =>
        prev
          ? {
              ...prev,
              rect: targetRect
            }
          : prev
      );
    });
  };

  const goPrev = useCallback(() => {
    setZoom((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.index === 0 ? imageItems.length - 1 : prev.index - 1;
      return { ...prev, index: nextIndex, sourceId: imageItems[nextIndex].id };
    });
  }, [imageItems]);

  const goNext = useCallback(() => {
    setZoom((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.index === imageItems.length - 1 ? 0 : prev.index + 1;
      return { ...prev, index: nextIndex, sourceId: imageItems[nextIndex].id };
    });
  }, [imageItems]);

  const closeZoom = useCallback(() => {
    setZoom((prev) => {
      if (!prev) return prev;
      const endRect = getThumbRect(prev.sourceId);
      if (!endRect) {
        return { ...prev, opacity: 0, closing: true };
      }
      return { ...prev, rect: endRect, closing: true };
    });

    window.setTimeout(() => setZoom(null), 260);
  }, []);

  useEffect(() => {
    if (!zoom?.open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeZoom();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoom?.open, closeZoom, goPrev, goNext]);

  useEffect(() => {
    if (!zoom) {
      lightboxSkipNextRefitRef.current = true;
    }
  }, [zoom]);

  useEffect(() => {
    if (!zoom?.open || zoom.closing || imageItems.length === 0) return;
    const item = imageItems[zoom.index];
    if (!item) return;

    if (lightboxSkipNextRefitRef.current) {
      lightboxSkipNextRefitRef.current = false;
      return;
    }

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return;
      const targetRect = fitIntoViewport(w, h, 24);
      setZoom((prev) => {
        if (!prev || prev.closing || prev.index !== zoom.index) return prev;
        return { ...prev, rect: targetRect };
      });
    };
    img.src = item.src;
  }, [zoom?.index, zoom?.open, zoom?.closing, imageItems]);

  const onLightboxTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    lightboxTouchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  };

  const onLightboxTouchEnd = (event: TouchEvent) => {
    const start = lightboxTouchStart.current;
    lightboxTouchStart.current = null;
    if (!start || imageItems.length < 2) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < LIGHTBOX_SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return;
    suppressBackdropClickRef.current = true;
    window.setTimeout(() => {
      suppressBackdropClickRef.current = false;
    }, 350);
    if (dx < 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  const onLightboxBackdropClick = () => {
    if (suppressBackdropClickRef.current) return;
    closeZoom();
  };

  return (
    <>
      <div className="projectMediaGrid">
        {media.map((item) => {
          const isLandscape = orientations[item.id] === "landscape";

          return (
            <CardReveal
              key={item.id}
              className={`projectMediaCard ${isLandscape ? "isLandscape" : ""}`}
            >
              {item.kind === "video" ? (
                <video
                  className="projectMedia"
                  controls
                  src={withBasePath(item.src)}
                  preload="metadata"
                  onLoadedMetadata={(event) =>
                    setOrientation(item.id, event.currentTarget.videoWidth, event.currentTarget.videoHeight)
                  }
                />
              ) : (
                <button
                  type="button"
                  className="projectMediaZoomButton"
                  data-zoom-id={item.id}
                  onClick={(event) => openZoom(item.id, event)}
                >
                  <img
                    className="projectMedia"
                    src={withBasePath(item.src)}
                    alt={item.caption || title}
                    loading="lazy"
                    onLoad={(event) =>
                      setOrientation(item.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
                    }
                  />
                </button>
              )}
              {item.caption ? <p className="caption">{item.caption}</p> : null}
            </CardReveal>
          );
        })}
      </div>
      {zoom ? (
        <div
          className="projectLightbox"
          role="dialog"
          aria-modal="true"
          onClick={onLightboxBackdropClick}
          onTouchStart={onLightboxTouchStart}
          onTouchEnd={onLightboxTouchEnd}
          onTouchCancel={() => {
            lightboxTouchStart.current = null;
          }}
        >
          <button
            type="button"
            className="projectLightboxNav projectLightboxNavPrev"
            aria-label="Предыдущее изображение"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
          >
            ←
          </button>
          <img
            className={`projectLightboxImage ${zoom.closing ? "isClosing" : ""}`}
            src={withBasePath(imageItems[zoom.index]?.src || "")}
            alt={imageItems[zoom.index]?.alt}
            style={{
              top: zoom.rect.top,
              left: zoom.rect.left,
              width: zoom.rect.width,
              height: zoom.rect.height,
              opacity: zoom.opacity
            }}
          />
          <button
            type="button"
            className="projectLightboxNav projectLightboxNavNext"
            aria-label="Следующее изображение"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
          >
            →
          </button>
        </div>
      ) : null}
    </>
  );
}
