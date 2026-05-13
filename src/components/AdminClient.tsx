"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AboutData, ADMIN_PROJECT_TAG_OPTIONS, MediaKind, Project, ProjectTag } from "@/lib/types";

const tagOptions = ADMIN_PROJECT_TAG_OPTIONS;

const initialForm = {
  title: "",
  slug: "",
  description: "",
  tag: "айдентика" as ProjectTag,
  preview: "/placeholder.svg",
  richText: "",
  structuredBlocksText: ""
};

function parseStructuredBlocks(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [titlePart, ...textParts] = line.split("|");
      return {
        title: (titlePart || "").trim(),
        text: textParts.join("|").trim()
      };
    })
    .filter((block) => block.title && block.text);
}

function getProjectMode(tag: ProjectTag) {
  if (tag === "айдентика") return "identity";
  if (tag === "шрифты") return "fonts";
  if (tag === "зины и книги") return "books";
  return "gallery";
}

export function AdminClient() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") {
      return "change-me";
    }
    return window.localStorage.getItem("admin_token") || "change-me";
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [about, setAbout] = useState<AboutData>({ title: "Обо мне", text: "", photos: [] });
  const [form, setForm] = useState(initialForm);
  const [initialMedia, setInitialMedia] = useState<string[]>([]);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, Record<string, string>>>({});
  const [status, setStatus] = useState("Введите токен и нажмите \"Подключиться\".");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const authHeaders = (): HeadersInit =>
    token ? { Authorization: `Bearer ${token}` } : {};

  async function refresh() {
    setBusy(true);
    const projectsRes = await fetch("/api/projects?scope=all", { headers: authHeaders() });
    if (projectsRes.status === 401) {
      setConnected(false);
      setStatus("Ошибка авторизации. Проверьте ADMIN_TOKEN.");
      setBusy(false);
      return;
    }
    const projectsData = await projectsRes.json();
    if (projectsRes.ok) {
      setProjects(projectsData.projects || []);
    }

    const aboutRes = await fetch("/api/about", { headers: authHeaders() });
    const aboutData = await aboutRes.json();
    if (aboutRes.ok) {
      setAbout(aboutData.about);
      setConnected(true);
      setStatus("Подключено. Данные загружены.");
    }
    setBusy(false);
  }

  async function upload(file: File): Promise<string> {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: authHeaders(),
      body
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload error");
    return data.url as string;
  }

  async function onCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!connected) {
      setStatus("Сначала подключитесь по токену.");
      return;
    }
    setBusy(true);
    const mode = getProjectMode(form.tag);
    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      tag: form.tag,
      preview: form.preview,
      structuredBlocks: mode === "identity" ? parseStructuredBlocks(form.structuredBlocksText) : [],
      richText: mode === "identity" ? form.richText : ""
    };
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const created = await res.json();
      const projectId = created.project.id as string;
      if (initialMedia.length > 0) {
        for (const src of initialMedia) {
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({
              mediaAppend: { kind: "image", src, caption: "" }
            })
          });
        }
      }
      setForm(initialForm);
      setInitialMedia([]);
      await refresh();
      setStatus("Проект сохранен.");
    } else {
      setStatus("Не удалось сохранить проект.");
    }
    setBusy(false);
  }

  async function patchProject(projectId: string, payload: unknown): Promise<boolean> {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
    return res.ok;
  }

  async function deleteProject(project: Project) {
    if (typeof window !== "undefined" && !window.confirm(`Удалить проект «${project.title}» безвозвратно?`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (!res.ok) {
        setStatus("Не удалось удалить проект.");
        return;
      }
      await refresh();
      setStatus("Проект удалён.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive(project: Project, archived: boolean) {
    if (!(await patchProject(project.id, { archived }))) {
      setStatus("Не удалось сохранить (архив). Проверьте токен.");
      return;
    }
    await refresh();
    setStatus(archived ? "Проект отправлен в архив." : "Проект возвращен из архива.");
  }

  async function togglePublished(project: Project, published: boolean) {
    if (!(await patchProject(project.id, { published }))) {
      setStatus("Не удалось сохранить публикацию. Проверьте токен.");
      return;
    }
    await refresh();
    setStatus(published ? "Проект опубликован." : "Черновик сохранён.");
  }

  async function addMedia(project: Project, file: File, kind: "image" | "gif" | "video") {
    const src = await upload(file);
    if (!(await patchProject(project.id, { mediaAppend: { kind, src, caption: "" } }))) {
      setStatus("Не удалось добавить медиа.");
      return;
    }
    await refresh();
    setStatus("Медиа добавлено в проект.");
  }

  async function replaceProjectMedia(project: Project, media: Project["media"]) {
    if (!(await patchProject(project.id, { media }))) {
      setStatus("Не удалось сохранить медиа.");
      return;
    }
    await refresh();
  }

  async function moveMedia(project: Project, currentIndex: number, direction: -1 | 1) {
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= project.media.length) return;
    const media = [...project.media];
    const [item] = media.splice(currentIndex, 1);
    media.splice(nextIndex, 0, item);
    await replaceProjectMedia(project, media);
    setStatus("Порядок медиа обновлен.");
  }

  async function saveMediaCaptions(project: Project) {
    const drafts = captionDrafts[project.id] || {};
    const media = project.media.map((item) => ({
      ...item,
      caption: drafts[item.id] ?? item.caption ?? ""
    }));
    await replaceProjectMedia(project, media);
    setStatus("Подписи медиа сохранены.");
  }

  async function replacePreview(project: Project, file: File) {
    const src = await upload(file);
    if (!(await patchProject(project.id, { preview: src }))) {
      setStatus("Не удалось обновить превью.");
      return;
    }
    await refresh();
    setStatus("Превью проекта обновлено.");
  }

  async function replaceMediaItem(project: Project, mediaId: string, file: File) {
    const src = await upload(file);
    const nextKind: MediaKind = file.type.includes("video")
      ? "video"
      : file.type.includes("gif")
        ? "gif"
        : "image";
    const media = project.media.map((item) =>
      item.id === mediaId ? { ...item, src, kind: nextKind } : item
    );
    await replaceProjectMedia(project, media);
    setStatus("Медиа проекта заменено.");
  }

  async function removeMediaItem(project: Project, mediaId: string) {
    const media = project.media.filter((item) => item.id !== mediaId);
    await replaceProjectMedia(project, media);
    setStatus("Медиа удалено.");
  }

  async function updateAbout() {
    if (!connected) {
      setStatus("Сначала подключитесь по токену.");
      return;
    }
    setBusy(true);
    await fetch("/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(about)
    });
    await refresh();
    setStatus("Страница About сохранена.");
    setBusy(false);
  }

  useEffect(() => {
    window.localStorage.setItem("admin_token", token);
  }, [token]);

  const detailTags = useMemo(() => ["айдентика", "шрифты"], []);
  const formMode = getProjectMode(form.tag);

  return (
    <main className="adminPanel cmsLook">
      <section className="adminCard adminHero">
        <h2>CMS Админка</h2>
        <p className="caption">
          Вход без отдельного логина: достаточно указать токен и нажать &quot;Подключиться&quot;.
        </p>
        <p className="caption">
          Если вы не меняли `.env.local`, используйте токен `change-me`.
        </p>
        <input
          placeholder="ADMIN_TOKEN"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button onClick={refresh} disabled={busy}>
          {busy ? "Загрузка..." : "Подключиться"}
        </button>
        <div className={`status ${connected ? "ok" : "warn"}`}>{status}</div>
      </section>

      <section className="adminCard">
        <h2>Новый проект</h2>
        <form onSubmit={onCreateProject}>
          <input
            placeholder="Название"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Slug (latin-only)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <textarea
            placeholder="Описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value as ProjectTag })}
          >
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          {formMode === "identity" ? (
            <>
              <textarea
                rows={6}
                placeholder="Rich text для проекта"
                value={form.richText}
                onChange={(e) => setForm({ ...form, richText: e.target.value })}
              />
              <textarea
                rows={4}
                placeholder="Структурные блоки: Заголовок | Текст (каждый блок с новой строки)"
                value={form.structuredBlocksText}
                onChange={(e) => setForm({ ...form, structuredBlocksText: e.target.value })}
              />
            </>
          ) : null}
          <label>
            Превью
            <input
              type="file"
              accept="image/*,video/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await upload(file);
                setForm({ ...form, preview: url });
              }}
            />
          </label>
          <label>
            {formMode === "books"
              ? "Слайды книги/зина (carousel, можно много)"
              : formMode === "fonts"
                ? "Галерея шрифта (можно много)"
                : formMode === "identity"
                  ? "Внутренние медиа айдентики (можно много)"
                  : "Галерея проекта (можно много)"}
            <input
              type="file"
              multiple
              accept={formMode === "books" ? "image/*,video/*" : "image/*"}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const urls = await Promise.all(files.map((f) => upload(f)));
                setInitialMedia(urls);
                setStatus(`Подготовлено ${urls.length} фото для проекта.`);
              }}
            />
          </label>
          <p className="caption">
            Внутрь проекта можно провалиться только для тегов {detailTags.join(", ")}. Остальные
            теги отображаются на главной как карточки/карусели.
          </p>
          <button type="submit">Создать</button>
        </form>
      </section>

      <section className="adminCard">
        <h2>Обо мне</h2>
        <input
          value={about.title}
          onChange={(e) => setAbout({ ...about, title: e.target.value })}
        />
        <textarea
          rows={6}
          value={about.text}
          onChange={(e) => setAbout({ ...about, text: e.target.value })}
        />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            const urls = await Promise.all(files.map((f) => upload(f)));
            setAbout({ ...about, photos: [...about.photos, ...urls] });
          }}
        />
        <button onClick={updateAbout}>Сохранить About</button>
      </section>

      <section className="adminCard">
        <h2>Проекты</h2>
        {!projects.length && <p className="caption">Пока нет проектов.</p>}
        {projects.map((project) => (
          <article key={project.id} className="projectRow">
            <div>
              <strong>{project.title}</strong> - {project.tag}
              <div className="caption">
                {project.published ? "Опубликован" : "Черновик"} /{" "}
                {project.archived ? "Архив" : "Активный"}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => toggleArchive(project, !project.archived)}>
                {project.archived ? "Вернуть из архива" : "В архив"}
              </button>
              <label className="caption" style={{ display: "block" }}>
                Replace preview проекта
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await replacePreview(project, file);
                  }}
                />
              </label>
              <label className="caption" style={{ display: "block" }}>
                Добавить медиа
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const file of files) {
                      const kind = file.type.includes("video")
                        ? "video"
                        : file.type.includes("gif")
                          ? "gif"
                          : "image";
                      await addMedia(project, file, kind);
                    }
                  }}
                />
              </label>
              {project.published ? (
                <button type="button" className="dangerButton" onClick={() => void deleteProject(project)}>
                  Удалить проект
                </button>
              ) : (
                <button type="button" onClick={() => togglePublished(project, true)}>
                  Опубликовать
                </button>
              )}
            </div>
            {project.media.length > 0 ? (
              <div className="mediaAdminList">
                {project.media.map((item, index) => (
                  <div key={item.id} className="mediaAdminRow">
                    <div className="caption">
                      #{index + 1} - {item.kind}
                    </div>
                    <div className="mediaAdminActions">
                      <button type="button" onClick={() => moveMedia(project, index, -1)} disabled={index === 0}>
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMedia(project, index, 1)}
                        disabled={index === project.media.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMediaItem(project, item.id)}
                        className="dangerButton"
                      >
                        Удалить
                      </button>
                    </div>
                    <input
                      placeholder="Подпись (caption)"
                      value={captionDrafts[project.id]?.[item.id] ?? item.caption ?? ""}
                      onChange={(e) =>
                        setCaptionDrafts((prev) => ({
                          ...prev,
                          [project.id]: {
                            ...(prev[project.id] || {}),
                            [item.id]: e.target.value
                          }
                        }))
                      }
                    />
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await replaceMediaItem(project, item.id, file);
                      }}
                    />
                  </div>
                ))}
                <button type="button" onClick={() => saveMediaCaptions(project)}>
                  Сохранить подписи
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
