import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdminAuthorized } from "@/lib/auth";
import { getProjects, saveProjects } from "@/lib/storage";
import { MediaItem, Project } from "@/lib/types";

type PatchBody = Partial<Project> & {
  mediaAppend?: Omit<MediaItem, "id">;
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const projects = await getProjects();
  const next = projects.filter((p) => p.id !== id);
  if (next.length === projects.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await saveProjects(next);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as PatchBody;
  const projects = await getProjects();
  const index = projects.findIndex((project) => project.id === id);
  if (index < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const target = projects[index];
  const { mediaAppend, ...patchRest } = body;
  const sanitizedPatch = { ...patchRest } as Record<string, unknown>;
  delete sanitizedPatch.createdAt;
  const updated: Project = {
    ...target,
    ...(sanitizedPatch as Partial<Project>)
  };

  if (mediaAppend) {
    updated.media = [
      ...target.media,
      {
        id: randomUUID(),
        kind: mediaAppend.kind,
        src: mediaAppend.src,
        caption: mediaAppend.caption || ""
      }
    ];
  }

  projects[index] = updated;
  await saveProjects(projects);
  return NextResponse.json({ project: updated });
}
