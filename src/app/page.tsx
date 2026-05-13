import { HomeContent } from "@/components/HomeContent";
import { sortProjectsForFeed } from "@/lib/projectOrder";
import { getProjects } from "@/lib/storage";
import { TAGS } from "@/lib/types";
import { projectMatchesNavTag } from "@/lib/tagDisplay";

const ALLOWED_TAGS = new Set<string>(TAGS.filter((t) => t !== "flow"));
/** Старые ссылки ?tag=иконки|логотипы|шрифты ведут в рубрику «графика». */
const LEGACY_GRAPHICS_TAGS = new Set(["иконки", "логотипы", "шрифты"]);

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const rawTag = params.tag || "flow";
  const normalized =
    rawTag !== "flow" && LEGACY_GRAPHICS_TAGS.has(rawTag)
      ? "графика"
      : ALLOWED_TAGS.has(rawTag) || rawTag === "flow"
        ? rawTag
        : "flow";

  const activeTag = normalized;
  const projects = await getProjects();

  const publishedProjects = projects.filter((project) => project.published && !project.archived);
  const byDate = sortProjectsForFeed(publishedProjects);
  const filtered =
    activeTag === "flow" ? byDate : byDate.filter((project) => projectMatchesNavTag(project.tag, activeTag));

  return <HomeContent activeTag={activeTag} projects={filtered} />;
}
