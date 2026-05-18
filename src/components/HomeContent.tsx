"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CardReveal } from "@/components/CardReveal";
import { FlowFeed } from "@/components/FlowFeed";
import { FlowPileFeed } from "@/components/FlowPileFeed";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { SiteNav } from "@/components/SiteNav";
import { displayTagLabel, projectMatchesNavTag } from "@/lib/tagDisplay";
import { withBasePath } from "@/lib/sitePath";
import { TAGS, type Project } from "@/lib/types";

function getCardDescription(description?: string) {
  if (!description) return "";
  const firstParagraph =
    description
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .find((part) => part.length > 0) || "";
  const compact = firstParagraph.replace(/\s+/g, " ").trim();
  if (compact.length <= 400) return compact;
  return `${compact.slice(0, 400).trim()}...`;
}

function isVideoPreview(src: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(src);
}

function getPreviewKind(src: string): "image" | "gif" | "video" {
  if (/\.(mp4|webm|ogg|mov)$/i.test(src)) return "video";
  if (/\.gif$/i.test(src)) return "gif";
  return "image";
}

type Props = {
  projects: Project[];
};

const ALLOWED_TAGS = new Set<string>(TAGS.filter((t) => t !== "flow"));
/** Старые ссылки ?tag=иконки|логотипы|шрифты ведут в рубрику «графика». */
const LEGACY_GRAPHICS_TAGS = new Set(["иконки", "логотипы", "шрифты"]);

export function HomeContent({ projects }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCaptions, setShowCaptions] = useState(true);

  const activeTag = useMemo(() => {
    const rawTag = searchParams.get("tag") || "flow";
    if (rawTag !== "flow" && LEGACY_GRAPHICS_TAGS.has(rawTag)) return "графика";
    if (ALLOWED_TAGS.has(rawTag) || rawTag === "flow") return rawTag;
    return "flow";
  }, [searchParams]);

  const visibleProjects = useMemo(
    () => (activeTag === "flow" ? projects : projects.filter((project) => projectMatchesNavTag(project.tag, activeTag))),
    [activeTag, projects]
  );

  const isFlow = activeTag === "flow";

  const flowLayout = useMemo(
    () => (searchParams.get("view") === "pile" ? "pile" : "mosaic"),
    [searchParams]
  );

  const prefetchProject = (slug: string) => {
    void router.prefetch(`/projects/${slug}`);
  };

  const renderFlowLayoutToggle = () => {
    const pile = flowLayout === "pile";
    const mosaicParams = new URLSearchParams(searchParams.toString());
    mosaicParams.delete("view");
    const mosaicQs = mosaicParams.toString();
    const mosaicHref = mosaicQs ? `/?${mosaicQs}` : "/";
    const pileParams = new URLSearchParams(searchParams.toString());
    pileParams.set("view", "pile");
    const pileHref = `/?${pileParams.toString()}`;

    return (
      <div className="flowViewToggle" role="group" aria-label="Вид раскладки Flow">
        <Link
          href={mosaicHref}
          className={`flowViewBtn ${!pile ? "flowViewBtnActive" : ""}`}
          aria-current={!pile ? "page" : undefined}
          title="Мозаика"
        >
          <span className="flowViewBtnIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        </Link>
        <Link
          href={pileHref}
          className={`flowViewBtn ${pile ? "flowViewBtnActive" : ""}`}
          aria-current={pile ? "page" : undefined}
          title="Куча на экране"
        >
          <span className="flowViewBtnIcon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.95" />
              <rect x="7" y="7" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        </Link>
      </div>
    );
  };

  const renderCaptionToggle = () => (
    <button
      type="button"
      role="switch"
      aria-checked={showCaptions}
      className={`captionIosSwitch ${showCaptions ? "captionIosSwitchOn" : ""}`}
      onClick={() => setShowCaptions((v) => !v)}
      aria-label={showCaptions ? "Скрыть подписи к работам" : "Показать подписи к работам"}
      title={showCaptions ? "Скрыть заголовок, описание и тег" : "Показать заголовок, описание и тег"}
    >
      <span className="captionIosTrack" aria-hidden>
        <span className="captionIosKnob">
          <span className="captionIosKnobLetters">
            T<span className="captionIosKnobLower">t</span>
          </span>
        </span>
      </span>
    </button>
  );

  const isNavigating = false;
  const navTargetSlug: string | null = null;

  const gridClass = ["grid", isFlow ? "flowGrid" : "", isNavigating ? "gridIsNavigating" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <SiteNav
        showTags
        activeTag={activeTag}
        tagLeading={() => (
          <>
            {isFlow ? renderFlowLayoutToggle() : null}
            {renderCaptionToggle()}
          </>
        )}
      />
      <main className={isFlow ? "flowMain" : "container"}>
        {isFlow ? (
          <div className="flowBackdrop" aria-hidden>
            <div className="flowBackdropStack">
              <div
                className="flowBackdropLayer flowBackdropLayerBase"
                style={{ backgroundImage: `url(${withBasePath("/flow-portrait-me.png")})` }}
              />
              <div
                className="flowBackdropLayer flowBackdropLayerBloom"
                style={{ backgroundImage: `url(${withBasePath("/flow-portrait-me.png")})` }}
              />
            </div>
            <div className="flowBackdropNoise" />
          </div>
        ) : null}
        {isFlow ? (
          <div className="flowMainInner">
            <h1 className="srOnly pageTitle">Flow</h1>
            {flowLayout === "pile" ? (
              <FlowPileFeed
                projects={visibleProjects}
                showCaptions={showCaptions}
                isNavigating={isNavigating}
                navTargetSlug={navTargetSlug}
                prefetchProject={prefetchProject}
              />
            ) : (
              <FlowFeed
                projects={visibleProjects}
                showCaptions={showCaptions}
                isNavigating={isNavigating}
                navTargetSlug={navTargetSlug}
                prefetchProject={prefetchProject}
              />
            )}
          </div>
        ) : (
          <>
            <h1 className="pageTitle">{activeTag}</h1>
            <section className={gridClass}>
              {visibleProjects.map((project) => (
                <CardReveal
                  key={`${activeTag}-${project.id}`}
                  className={[
                    "cardRevealItem",
                    isNavigating && navTargetSlug === project.slug ? "cardRevealIsActive" : "",
                    isNavigating && navTargetSlug !== project.slug ? "cardRevealIsBackground" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <article className="card">
                    {(() => {
                      const canOpenProject = project.detailsEnabled && project.slug.trim().length > 0;
                      const carouselMedia = [
                        {
                          id: `${project.id}-preview`,
                          kind: getPreviewKind(project.preview),
                          src: project.preview
                        },
                        ...project.media.filter((item) => item.src !== project.preview)
                      ];
                      if (canOpenProject) {
                        return (
                          <Link
                            href={`/projects/${project.slug}`}
                            prefetch
                            onMouseEnter={() => prefetchProject(project.slug)}
                          >
                            {isVideoPreview(project.preview) ? (
                              <video
                                className="cardMedia"
                                src={withBasePath(project.preview)}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img className="cardMedia" src={withBasePath(project.preview)} alt={project.title} />
                            )}
                          </Link>
                        );
                      }
                      if (carouselMedia.length > 1) {
                        return <ProjectMediaCarousel title={project.title} media={carouselMedia} />;
                      }
                      if (isVideoPreview(project.preview)) {
                        return (
                          <video
                            className="cardMedia"
                            src={withBasePath(project.preview)}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="metadata"
                          />
                        );
                      }
                      return <img className="cardMedia" src={withBasePath(project.preview)} alt={project.title} />;
                    })()}
                    {showCaptions ? (
                      <div className="cardBody">
                        {project.detailsEnabled && project.slug.trim().length > 0 ? (
                          <strong className="cardTitle">
                            <Link
                              href={`/projects/${project.slug}`}
                              prefetch
                              onMouseEnter={() => prefetchProject(project.slug)}
                              className="cardTitleLink"
                            >
                              {project.title}
                            </Link>
                          </strong>
                        ) : (
                          <strong className="cardTitle">{project.title}</strong>
                        )}
                        {project.description ? (
                          <p className="cardDescription">{getCardDescription(project.description)}</p>
                        ) : null}
                        <span className="cardTag">{displayTagLabel(project.tag)}</span>
                      </div>
                    ) : null}
                  </article>
                </CardReveal>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
