import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { ProjectMediaGrid } from "@/components/ProjectMediaGrid";
import { ProjectRichTextCollapse } from "@/components/ProjectRichTextCollapse";
import { sortProjectsForFeed } from "@/lib/projectOrder";
import { displayTagLabel } from "@/lib/tagDisplay";
import { getProjects } from "@/lib/storage";

function isVideoPreview(src: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(src);
}

function getNearbyProjects<T>(items: T[], currentIndex: number, count = 3): T[] {
  const total = items.length;
  if (total <= 1) return [];

  const picked = new Set<number>();
  const hasPrev = currentIndex - 1 >= 0;
  const hasTwoNext = currentIndex + 2 < total;

  // Базовое правило: 1 предыдущий + 2 следующих.
  if (hasPrev && hasTwoNext) {
    picked.add(currentIndex - 1);
    picked.add(currentIndex + 1);
    picked.add(currentIndex + 2);
  } else if (!hasPrev) {
    // Нет предыдущего -> 3 следующих.
    for (let i = currentIndex + 1; i < total && picked.size < count; i += 1) {
      picked.add(i);
    }
  } else {
    // Нет двух следующих -> 3 предыдущих.
    for (let i = currentIndex - 1; i >= 0 && picked.size < count; i -= 1) {
      picked.add(i);
    }
  }

  // Добор до трех с противоположной стороны (если в первичном наборе меньше 3).
  if (picked.size < count) {
    for (let i = currentIndex + 1; i < total && picked.size < count; i += 1) {
      picked.add(i);
    }
  }
  if (picked.size < count) {
    for (let i = currentIndex - 1; i >= 0 && picked.size < count; i -= 1) {
      picked.add(i);
    }
  }

  return Array.from(picked)
    .sort((a, b) => a - b)
    .map((idx) => items[idx]);
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const projects = await getProjects();
  const feed = sortProjectsForFeed(
    projects.filter((item) => item.published && !item.archived && item.detailsEnabled)
  );
  const currentIndex = feed.findIndex((item) => item.slug === slug);
  const project = currentIndex >= 0 ? feed[currentIndex] : null;

  if (!project || !project.detailsEnabled) {
    notFound();
  }

  const mediaForGrid = project.media.filter((item) => item.src !== project.preview);
  const nearbyProjects = getNearbyProjects(feed, currentIndex, 3);

  return (
    <>
      <SiteNav />
      <main className="projectPage">
        <figure className="projectHeroPreview">
          {isVideoPreview(project.preview) ? (
            <video
              className="projectHeroPreviewMedia"
              src={project.preview}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={project.title}
            />
          ) : (
            <img
              className="projectHeroPreviewMedia"
              src={project.preview}
              alt={project.title}
              fetchPriority="high"
            />
          )}
        </figure>
        <div className="projectBodyOverlap">
          <div className="projectArticle">
            <div className="projectArticleMain">
              <header className="projectHero">
                <h1 className="projectTitle">{project.title}</h1>
                {project.description ? <p className="projectDescription">{project.description}</p> : null}
                {project.richText ? <ProjectRichTextCollapse text={project.richText} /> : null}
                <div className="projectTagRow">
                  <span className="cardTag">{displayTagLabel(project.tag)}</span>
                </div>
              </header>
              {project.structuredBlocks?.length ? (
                <div className="projectBlocks">
                  {project.structuredBlocks.map((block, index) => (
                    <section key={`${project.id}-${index}`} className="projectBlock">
                      <h3>{block.title}</h3>
                      <p>{block.text}</p>
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {mediaForGrid.length > 0 ? (
            <ProjectMediaGrid media={mediaForGrid} title={project.title} />
          ) : null}
          {nearbyProjects.length > 0 ? (
            <section className="projectNearbySection" aria-labelledby="project-nearby-heading">
              <h2 id="project-nearby-heading" className="projectNearbyHeading">
                Другие проекты
              </h2>
              <div className="projectNearby">
                {nearbyProjects.map((item) => (
                  <Link key={item.id} className="projectNearbyItem" href={`/projects/${item.slug}`}>
                    {isVideoPreview(item.preview) ? (
                      <video
                        className="projectNearbyMedia"
                        src={item.preview}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-hidden
                      />
                    ) : (
                      <img className="projectNearbyMedia" src={item.preview} alt={item.title} loading="lazy" />
                    )}
                    <span className="projectNearbyTitle">{item.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
