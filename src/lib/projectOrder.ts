import { Project } from "@/lib/types";

export function sortProjectsForFeed(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const aHasManual = typeof a.manualOrder === "number";
    const bHasManual = typeof b.manualOrder === "number";

    if (aHasManual && bHasManual) {
      return (a.manualOrder as number) - (b.manualOrder as number);
    }
    if (aHasManual) return -1;
    if (bHasManual) return 1;

    return a.title.localeCompare(b.title, "ru");
  });
}
