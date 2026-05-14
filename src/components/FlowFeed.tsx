"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
        return;
      }
      const w = el.clientWidth;
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

  const layoutHeight = useMemo(() => {
    if (boxes.length === 0) return Math.max(h, 200);
    const captionTail = !wide && showCaptions ? FLOW_MOSAIC_TITLE_BAND : 0;
    let m = 0;
    projects.forEach((p, i) => {
      const b = boxes[i];
      if (!b) return;
      m = Math.max(m, b.top + b.height + captionTail);
    });
    return Math.max(h, Math.ceil(m + 48));
  }, [boxes, projects, h, wide, showCaptions]);

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
          const canOpenProject = project.detailsEnabled && project.slug.trim().length > 0;
          const hostW = wide ? outer.w : (mobileLayout?.hostW ?? outer.w);
          const hostStyle = box
            ? {
                position: "absolute" as const,
                left: box.left,
                top: box.top,
                width: hostW
              }
            : undefined;

          return (
            <div
              key={`flow-host-${project.id}`}
              className={[
                "flowMosaicCardHost",
                isNavigating && navTargetSlug === project.slug ? "cardRevealIsActive" : "",
                isNavigating && navTargetSlug !== project.slug ? "cardRevealIsBackground" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              style={hostStyle}
            >
              <CardReveal className={["cardRevealItem", wide ? "flowMosaicItem" : ""].filter(Boolean).join(" ")}>
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
                            prefetch={false}
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
