/** Навигация на главной: «иконки», «логотипы», «шрифты» объединены в «графика». Рубрику «зины и книги» временно убрали из меню — тег остаётся только в данных/админке. */
export const TAGS = ["flow", "айдентика", "графика", "плакаты", "эксперименты"] as const;

/** Старые теги, которые считаются рубрикой «графика» в фильтре и подписи. */
export const GRAPHICS_GROUP_TAGS = ["графика", "иконки", "логотипы", "шрифты"] as const;

export type ProjectTag =
  | Exclude<(typeof TAGS)[number], "flow">
  | "иконки"
  | "логотипы"
  | "шрифты"
  | "зины и книги";

/** Порядок тегов в админках (включая устаревшие значения для старых записей). */
export const ADMIN_PROJECT_TAG_OPTIONS: readonly ProjectTag[] = [
  "айдентика",
  "графика",
  "плакаты",
  "эксперименты",
  "иконки",
  "логотипы",
  "шрифты",
  "зины и книги"
];

export type MediaKind = "image" | "gif" | "video";

export type MediaItem = {
  id: string;
  kind: MediaKind;
  src: string;
  caption?: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  tag: ProjectTag;
  preview: string;
  detailsEnabled: boolean;
  published: boolean;
  archived: boolean;
  media: MediaItem[];
  /** Ручной порядок из админки; меньше = выше. Если не задано — по названию. */
  manualOrder?: number;
  richText?: string;
  structuredBlocks?: Array<{
    title: string;
    text: string;
  }>;
};

export type AboutData = {
  title: string;
  text: string;
  photos: string[];
};
