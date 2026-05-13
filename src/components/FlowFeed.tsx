"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { CardReveal } from "@/components/CardReveal";
import {
  computeFlowMosaicLayout,
  computeFlowMobileMosaicLayout,
  FLOW_MOSAIC_TITLE_BAND,
  flowItemOuterSize,
  flowMobileCardInnerSize,
  flowMobileItemOuterSize,
  flowMosaicContentHeight,
  type FlowMosaicBox
} from "@/lib/flowMosaicLayout";
import type { Project } from "@/lib/types";
import { FlowCardMedia } from "@/components/FlowCardMedia";

const MOSAIC_MQ = "(min-width: 900px)";
const DRAG_THRESHOLD = 6;

type DragSession = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  originDx: number;
  originDy: number;
};

type Props = {
  projects: Project[];
  showCaptions: boolean;
  isNavigating: boolean;
  navTargetSlug: string | null;
  prefetchProject: (slug: string) => void;
};

export function FlowFeed({
  projects,
  showCaptions,
  isNavigating,
  navTargetSlug,
  prefetchProject
}: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [boxes, setBoxes] = useState<FlowMosaicBox[]>([]);
  const [h, setH] = useState(400);
  /** Смещения превью при перетаскивании; сбрасываются при пересчёте сетки (F5 — новый рандом). */
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const offsetsRef = useRef(offsets);
  offsetsRef.current = offsets;
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  /** На мобилке: 2 колонки, зазор 32px — размер превью и ширина хоста (см. computeFlowMobileMosaicLayout). */
  const [mobileLayout, setMobileLayout] = useState<{ tile: number; hostW: number } | null>(null);

  const [layoutEntropy] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const seed = useMemo(
    () => `${projects.map((p) => p.slug).join("\0")}\x01${layoutEntropy}`,
    [projects, layoutEntropy]
  );
  const outer = useMemo(() => flowItemOuterSize(), []);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOSAIC_MQ);
    const el = measureRef.current;

    const update = () => {
      const isWide = mq.matches;
      setWide(isWide);
      if (!el) {
        setBoxes([]);
        setH(200);
        setOffsets({});
        return;
      }
      const w = el.clientWidth;
      setOffsets({});
      const footerReserve = !isWide && showCaptions ? FLOW_MOSAIC_TITLE_BAND : 0;
      if (isWide) {
        setMobileLayout(null);
        const next = computeFlowMosaicLayout(projects.length, w, seed);
        setBoxes(next);
        setH(flowMosaicContentHeight(next, footerReserve));
      } else {
        setMobileLayout({
          tile: flowMobileCardInnerSize(w),
          hostW: flowMobileItemOuterSize(w).w
        });
        const next = computeFlowMobileMosaicLayout(projects.length, w, seed);
        setBoxes(next);
        setH(flowMosaicContentHeight(next, footerReserve));
      }
    };

    update();
    mq.addEventListener("change", update);
    if (!el) {
      return () => mq.removeEventListener("change", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      mq.removeEventListener("change", update);
      ro.disconnect();
    };
  }, [projects.length, seed, showCaptions]);

  useEffect(() => {
    if (!dragSession) return;
    const { id, pointerId, startX, startY, originDx, originDy } = dragSession;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMovedRef.current = true;
      setOffsets((prev) => ({
        ...prev,
        [id]: { dx: originDx + dx, dy: originDy + dy }
      }));
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (dragMovedRef.current) suppressClickRef.current = true;
      setDragSession(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [dragSession]);

  const layoutHeight = useMemo(() => {
    if (boxes.length === 0) return Math.max(h, 200);
    const captionTail = !wide && showCaptions ? FLOW_MOSAIC_TITLE_BAND : 0;
    let m = 0;
    projects.forEach((p, i) => {
      const b = boxes[i];
      if (!b) return;
      const off = offsets[p.id] || { dx: 0, dy: 0 };
      m = Math.max(m, b.top + b.height + off.dy + captionTail);
    });
    return Math.max(h, Math.ceil(m + 48));
  }, [boxes, projects, offsets, h, wide, showCaptions]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, projectId: string) => {
      if (!wide || isNavigating || e.button !== 0) return;
      const o = offsetsRef.current[projectId] || { dx: 0, dy: 0 };
      dragMovedRef.current = false;
      setDragSession({
        id: projectId,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originDx: o.dx,
        originDy: o.dy
      });
    },
    [wide, isNavigating]
  );

  const handleClickCapture = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const gridClass = ["grid", "flowGrid", isNavigating ? "gridIsNavigating" : ""].filter(Boolean).join(" ");

  return (
    <section className={gridClass}>
      <div
        ref={measureRef}
        className={`flowMosaicRoot ${wide ? "flowMosaicRootDesktop" : "flowMosaicRootMobile"}`}
        style={boxes.length > 0 ? { minHeight: layoutHeight } : undefined}
      >
        {projects.map((project, i) => {
          const box = boxes[i];
          const off = offsets[project.id] || { dx: 0, dy: 0 };
          const canOpenProject = project.detailsEnabled && project.slug.trim().length > 0;
          const hostW = wide ? outer.w : (mobileLayout?.hostW ?? outer.w);
          const hostStyle = box
            ? {
                position: "absolute" as const,
                left: box.left + off.dx,
                top: box.top + off.dy,
                width: hostW
              }
            : undefined;

          return (
            <div
              key={`flow-host-${project.id}`}
              className={[
                "flowMosaicCardHost",
                wide ? "flowMosaicCardHostWide" : "",
                isNavigating && navTargetSlug === project.slug ? "cardRevealIsActive" : "",
                isNavigating && navTargetSlug !== project.slug ? "cardRevealIsBackground" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              style={hostStyle}
              onPointerDown={wide ? (e) => handlePointerDown(e, project.id) : undefined}
              onClickCapture={wide ? handleClickCapture : undefined}
            >
              <CardReveal
                className={["cardRevealItem", wide ? "flowMosaicItem" : ""].filter(Boolean).join(" ")}
              >
                <article className="card flowCard">
                  <FlowCardMedia
                    project={project}
                    prefetchProject={prefetchProject}
                    tilePx={wide ? undefined : (mobileLayout?.tile ?? 121)}
                  />
                  {showCaptions ? (
                    <div className="cardBody flowCardBody">
                      {canOpenProject ? (
                        <strong className="flowCardTitle">
                          <Link
                            href={`/projects/${project.slug}`}
                            prefetch
                            onMouseEnter={() => prefetchProject(project.slug)}
                            className="flowCardTitleLink"
                          >
                            {project.title}
                          </Link>
                        </strong>
                      ) : (
                        <strong className="flowCardTitle">{project.title}</strong>
                      )}
                    </div>
                  ) : null}
                </article>
              </CardReveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}
