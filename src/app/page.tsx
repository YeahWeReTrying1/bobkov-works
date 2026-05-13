import { Suspense } from "react";
import { HomeContent } from "@/components/HomeContent";
import { sortProjectsForFeed } from "@/lib/projectOrder";
import { getProjects } from "@/lib/storage";

export default async function HomePage() {
  const projects = await getProjects();
  const publishedProjects = projects.filter((project) => project.published && !project.archived);
  const byDate = sortProjectsForFeed(publishedProjects);

  return (
    <Suspense fallback={null}>
      <HomeContent projects={byDate} />
    </Suspense>
  );
}
