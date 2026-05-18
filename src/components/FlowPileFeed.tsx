"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CardReveal } from "@/components/CardReveal";
import { FlowCardMedia } from "@/components/FlowCardMedia";
import { FLOW_MOSAIC_TITLE_BAND, FLOW_CARD_INNER_PX } from "@/lib/flowMosaicLayout";
import { computeFlowPileLayout, type FlowPileBox } from "@/lib/flowPileLayout";
import type { Project } from "@/lib/types";

const STROKE = 8;

type Props = {
  projects: Project[];
  showCaptions: boolean;
  isNavigating: boolean;
  navTargetSlug: string | null;
  prefetchProject: (slug: string) => void;
};

export function FlowPileFeed({
  projects,
  showCaptions,
  isNavigating,
  navTargetSlug,
  prefetchProject
}: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<FlowPileBox[]>([]);

  const [layoutEntropy] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const seed = useMemo(
    () => `${projects.map((p) => p.slug).join("\0")}\x01${layoutEntropy}\x02pile`,
    [projects, layoutEntropy]
  );

  useLayoutEffect(() => {
    const el = measureRef.current;
    const update = () => {
      if (!el) {
        setBoxes([]);
        return;
      }
      const w = el.clientWidth;
      const h = Math.max(el.clientHeight, Math.min(window.innerHeight - 72, 900));
      const titleReserve = showCaptions ? Math.min(FLOW_MOSAIC_TITLE_BAND, 52) : 0;
      setBoxes(computeFlowPileLayout(projects.length, w, h, seed, titleReserve));
    };

    update();
    const ro = new ResizeObserver(update);
    if (el) ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [projects.length, seed, showCaptions]);

  const gridClass = ["grid", "flowGrid", "flowPileGrid", isNavigating ? "gridIsNavigating" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={gridClass}>
      <div ref={measureRef} className="flowPileRoot">
        {projects.map((project, i) => {
          const box = boxes[i];
          const canOpenProject = project.detailsEnabled && project.slug.trim().length > 0;
          const inner = box ? Math.max(40, Math.round(box.width - 2 * STROKE)) : FLOW_CARD_INNER_PX;
          const hostStyle = box
            ? {
                position: "absolute" as const,
                left: box.left,
                top: box.top,
                width: box.width,
                zIndex: box.z
              }
            : undefined;

          return (
            <div
              key={`flow-pile-${project.id}`}
              className={[
                "flowPileHost",
                isNavigating && navTargetSlug === project.slug ? "cardRevealIsActive" : "",
                isNavigating && navTargetSlug !== project.slug ? "cardRevealIsBackground" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              style={hostStyle}
            >
              <CardReveal className="cardRevealItem flowPileReveal">
                <article className="card flowCard">
                  <FlowCardMedia project={project} prefetchProject={prefetchProject} tilePx={inner} />
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
