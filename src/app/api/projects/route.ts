import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { sortProjectsForFeed } from "@/lib/projectOrder";
import { isAdminAuthorized } from "@/lib/auth";
import { getProjects, saveProjects } from "@/lib/storage";
import { Project } from "@/lib/types";

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") || "published";
  const projects = await getProjects();
  if (scope === "all") {
    if (!isAdminAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ projects: sortProjectsForFeed(projects) });
  }
  return NextResponse.json({
    projects: projects.filter((project) => project.published && !project.archived)
  });
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { orderedIds?: string[] };
  const orderedIds = Array.isArray(payload.orderedIds) ? payload.orderedIds : [];
  if (!orderedIds.length) {
    return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
  }

  const projects = await getProjects();
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  const sortedCurrent = sortProjectsForFeed(projects);

  for (const project of sortedCurrent) {
    if (!rank.has(project.id)) {
      rank.set(project.id, rank.size);
    }
  }

  const updated = projects.map((project) => ({
    ...project,
    manualOrder: rank.get(project.id) ?? undefined
  }));

  await saveProjects(updated);
  return NextResponse.json({ projects: sortProjectsForFeed(updated) });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await request.json();
  const projects = await getProjects();
  const detailsEnabled = payload.tag === "айдентика" || payload.tag === "шрифты";
  const newProject: Project = {
    id: randomUUID(),
    slug: payload.slug,
    title: payload.title,
    description: payload.description || "",
    tag: payload.tag,
    preview: payload.preview || "/placeholder.svg",
    detailsEnabled,
    published: true,
    archived: false,
    media: [],
    richText: payload.richText || "",
    structuredBlocks: Array.isArray(payload.structuredBlocks) ? payload.structuredBlocks : []
  };
  projects.push(newProject);
  await saveProjects(projects);
  return NextResponse.json({ project: newProject });
}
