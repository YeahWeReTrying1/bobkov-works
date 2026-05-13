import { GRAPHICS_GROUP_TAGS, type ProjectTag } from "@/lib/types";

const graphicsSet = new Set<string>(GRAPHICS_GROUP_TAGS);

/** Подпись тега на карточке и в шапке проекта: старые иконки/логотипы/шрифты → «графика». */
export function displayTagLabel(tag: ProjectTag): string {
  if (graphicsSet.has(tag)) return "графика";
  return tag;
}

/** Фильтр главной: рубрика «графика» собирает несколько значений в данных. */
export function projectMatchesNavTag(projectTag: ProjectTag, activeNavTag: string): boolean {
  if (activeNavTag === "графика") {
    return graphicsSet.has(projectTag);
  }
  return projectTag === activeNavTag;
}
