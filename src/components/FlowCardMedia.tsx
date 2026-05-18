"use client";

import Link from "next/link";
import { withBasePath } from "@/lib/sitePath";
import { FLOW_CARD_INNER_PX } from "@/lib/flowMosaicLayout";
import type { Project } from "@/lib/types";

function isVideoPreview(src: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(src);
}

type Props = {
  project: Project;
  prefetchProject: (slug: string) => void;
  /** Мобилка: сторона квадрата превью в px (по умолчанию FLOW_CARD_INNER_PX). */
  tilePx?: number;
};

export function FlowCardMedia({ project, prefetchProject, tilePx = FLOW_CARD_INNER_PX }: Props) {
  const media = isVideoPreview(project.preview) ? (
    <video
      className="flowCardMedia"
      src={withBasePath(project.preview)}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-label={project.title}
    />
  ) : (
    <img className="flowCardMedia" src={withBasePath(project.preview)} alt="" />
  );

  const canOpenProject = project.detailsEnabled && project.slug.trim().length > 0;
  const clip = canOpenProject ? (
    <Link
      href={`/projects/${project.slug}`}
      prefetch={false}
      onMouseEnter={() => prefetchProject(project.slug)}
      className="flowCardMediaLink"
    >
      {media}
    </Link>
  ) : (
    media
  );

  const clipSize = { width: tilePx, height: tilePx, maxWidth: tilePx } as const;

  return (
    <div className="flowCardFrame" style={{ width: tilePx, maxWidth: tilePx }}>
      <div className="flowCardMediaClip" style={clipSize}>
        {clip}
      </div>
    </div>
  );
}
