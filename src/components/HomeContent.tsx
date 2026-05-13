"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, startTransition, useState, useTransition } from "react";
import { CardReveal } from "@/components/CardReveal";
import { FlowFeed } from "@/components/FlowFeed";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { SiteNav } from "@/components/SiteNav";
import { displayTagLabel } from "@/lib/tagDisplay";
import type { Project } from "@/lib/types";

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
  activeTag: string;
  projects: Project[];
};

export function HomeContent({ activeTag, projects }: Props) {
  const router = useRouter();
  const [showCaptions, setShowCaptions] = useState(true);
  const [navTargetSlug, setNavTargetSlug] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isFlow = activeTag === "flow";

  const isModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

  const prefetchProject = (slug: string) => {
    void router.prefetch(`/projects/${slug}`);
  };

  const openProjectFromTitle = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    if (!isFlow) {
      router.push(`/projects/${slug}`);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(`/projects/${slug}`);
      return;
    }

    setNavTargetSlug(slug);
    startTransition(() => {
      router.push(`/projects/${slug}`);
    });
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

  const isNavigating = navTargetSlug !== null;

  const gridClass = ["grid", isFlow ? "flowGrid" : "", isNavigating ? "gridIsNavigating" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <SiteNav showTags activeTag={activeTag} tagLeading={renderCaptionToggle} />
      <main className={isFlow ? "flowMain" : "container"}>
        {isFlow ? (
          <div className="flowBackdrop" aria-hidden>
            <div className="flowBackdropStack">
              <div
                className="flowBackdropLayer flowBackdropLayerBase"
                style={{ backgroundImage: "url(/flow-portrait-me.png)" }}
              />
              <div
                className="flowBackdropLayer flowBackdropLayerBloom"
                style={{ backgroundImage: "url(/flow-portrait-me.png)" }}
              />
            </div>
            <div className="flowBackdropNoise" />
          </div>
        ) : null}
        {isFlow ? (
          <div className="flowMainInner">
            <h1 className="srOnly pageTitle">Flow</h1>
            <FlowFeed
              projects={projects}
              showCaptions={showCaptions}
              isNavigating={isNavigating}
              navTargetSlug={navTargetSlug}
              prefetchProject={prefetchProject}
              openProjectFromTitle={openProjectFromTitle}
            />
          </div>
        ) : (
          <>
            <h1 className="pageTitle">{activeTag}</h1>
            <section className={gridClass}>
              {projects.map((project) => (
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
                      const carouselMedia = [
                        {
                          id: `${project.id}-preview`,
                          kind: getPreviewKind(project.preview),
                          src: project.preview
                        },
                        ...project.media.filter((item) => item.src !== project.preview)
                      ];
                      if (project.detailsEnabled) {
                        return (
                          <Link
                            href={`/projects/${project.slug}`}
                            prefetch
                            onMouseEnter={() => prefetchProject(project.slug)}
                            onClick={(event) => openProjectFromTitle(event, project.slug)}
                          >
                            {isVideoPreview(project.preview) ? (
                              <video
                                className="cardMedia"
                                src={project.preview}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img className="cardMedia" src={project.preview} alt={project.title} />
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
                            src={project.preview}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="metadata"
                          />
                        );
                      }
                      return <img className="cardMedia" src={project.preview} alt={project.title} />;
                    })()}
                    {showCaptions ? (
                      <div className="cardBody">
                        {project.detailsEnabled ? (
                          <strong className="cardTitle">
                            <Link
                              href={`/projects/${project.slug}`}
                              prefetch
                              onMouseEnter={() => prefetchProject(project.slug)}
                              className="cardTitleLink"
                              onClick={(event) => openProjectFromTitle(event, project.slug)}
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
