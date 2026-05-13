import fs from "node:fs/promises";
import path from "node:path";
import { AboutData, Project } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const projectsPath = path.join(dataDir, "projects.json");
const aboutPath = path.join(dataDir, "about.json");

const defaultAbout: AboutData = {
  title: "Обо мне",
  text: "Я графический дизайнер. Этот текст можно отредактировать в админке. Здесь может быть ваша история, подход к работе, опыт и контакты.",
  photos: []
};

async function ensureDataFile(filePath: string, fallback: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, fallback, "utf-8");
  }
}

function stripLegacyCreatedAt<T extends Record<string, unknown>>(item: T): T {
  const { createdAt: _legacy, ...rest } = item;
  return rest as T;
}

export async function getProjects(): Promise<Project[]> {
  await ensureDataFile(projectsPath, "[]");
  const raw = await fs.readFile(projectsPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) =>
    item && typeof item === "object" ? stripLegacyCreatedAt(item as Record<string, unknown>) : item
  ) as Project[];
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await ensureDataFile(projectsPath, "[]");
  const cleaned = projects.map((p) => stripLegacyCreatedAt({ ...p } as Record<string, unknown>));
  await fs.writeFile(projectsPath, JSON.stringify(cleaned, null, 2), "utf-8");
}

export async function getAbout(): Promise<AboutData> {
  await ensureDataFile(aboutPath, JSON.stringify(defaultAbout, null, 2));
  const raw = await fs.readFile(aboutPath, "utf-8");
  return JSON.parse(raw) as AboutData;
}

export async function saveAbout(about: AboutData): Promise<void> {
  await ensureDataFile(aboutPath, JSON.stringify(defaultAbout, null, 2));
  await fs.writeFile(aboutPath, JSON.stringify(about, null, 2), "utf-8");
}
