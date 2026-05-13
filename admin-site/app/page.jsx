"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** «зины и книги» временно не в рубриках на главном сайте — в админке оставлено для старых проектов */
const TAGS = [
  "айдентика",
  "графика",
  "плакаты",
  "эксперименты",
  "иконки",
  "логотипы",
  "шрифты",
  "зины и книги"
];

const initialForm = {
  title: "",
  slug: "",
  description: "",
  tag: "айдентика",
  preview: "/placeholder.svg",
  richText: "",
  structuredBlocksText: ""
};

function parseStructuredBlocks(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [titlePart, ...textParts] = line.split("|");
      return { title: (titlePart || "").trim(), text: textParts.join("|").trim() };
    })
    .filter((block) => block.title && block.text);
}

function getProjectMode(tag) {
  if (tag === "айдентика") return "identity";
  if (tag === "шрифты") return "fonts";
  if (tag === "зины и книги") return "books";
  return "gallery";
}

function moveInArray(list, fromIndex, toIndex) {
  const clone = [...list];
  const [item] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, item);
  return clone;
}

export default function AdminStandalonePage() {
  const router = useRouter();
  const [tab, setTab] = useState("projects");
  const [token, setToken] = useState(() => (typeof window === "undefined" ? "change-me" : window.localStorage.getItem("admin_token") || "change-me"));
  const [projects, setProjects] = useState([]);
  const [about, setAbout] = useState({ title: "Обо мне", text: "", photos: [] });
  const [form, setForm] = useState(initialForm);
  const [initialMedia, setInitialMedia] = useState([]);
  const [status, setStatus] = useState("Введите токен и нажмите «Подключиться».");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState(null);

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  useEffect(() => {
    window.localStorage.setItem("admin_token", token);
  }, [token]);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const projectsRes = await fetch("/api/projects?scope=all", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (projectsRes.status === 401) {
        setConnected(false);
        setStatus("Ошибка авторизации. Проверь ADMIN_TOKEN.");
        return;
      }
      const projectsData = await projectsRes.json();
      if (projectsRes.ok) setProjects(projectsData.projects || []);

      const aboutRes = await fetch("/api/about", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const aboutData = await aboutRes.json();
      if (aboutRes.ok) {
        setAbout(aboutData.about);
        setConnected(true);
        setStatus("Подключено. Данные загружены.");
      }
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token, refresh]);

  async function upload(file) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload error");
    return data.url;
  }

  async function patchProject(projectId, payload) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
    return res.ok;
  }

  async function saveOrder(orderedIds) {
    const res = await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ orderedIds })
    });
    if (!res.ok) throw new Error("Не удалось сохранить порядок");
    const data = await res.json();
    setProjects(data.projects || []);
  }

  async function onCreateProject(e) {
    e.preventDefault();
    if (!connected) return setStatus("Сначала подключитесь по токену.");
    setBusy(true);
    try {
      const mode = getProjectMode(form.tag);
      const payload = {
        ...form,
        structuredBlocks: mode === "identity" ? parseStructuredBlocks(form.structuredBlocksText) : [],
        richText: mode === "identity" ? form.richText : ""
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        setStatus("Не удалось создать проект.");
        return;
      }
      const created = await res.json();
      const projectId = created.project.id;
      for (const src of initialMedia) {
        if (!(await patchProject(projectId, { mediaAppend: { kind: "image", src, caption: "" } }))) {
          setStatus("Проект создан, но часть медиа не сохранилась.");
          break;
        }
      }
      setForm(initialForm);
      setInitialMedia([]);
      await refresh();
      setStatus("Проект создан.");
      setTab("projects");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(project) {
    if (!(await patchProject(project.id, { published: !project.published }))) {
      setStatus("Не удалось сохранить публикацию. Запущен ли сайт на :3000 и верен ли токен?");
      return;
    }
    await refresh();
    setStatus("Статус публикации обновлён.");
  }

  async function toggleArchived(project) {
    if (!(await patchProject(project.id, { archived: !project.archived }))) {
      setStatus("Не удалось сохранить архив. Запущен ли сайт на :3000 и верен ли токен?");
      return;
    }
    await refresh();
    setStatus("Статус архива обновлён.");
  }

  async function deleteProject(project) {
    if (!window.confirm(`Удалить проект «${project.title}» безвозвратно?`)) return;
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
  }

  async function replacePreview(project, file) {
    const src = await upload(file);
    if (!(await patchProject(project.id, { preview: src }))) {
      setStatus("Не удалось сохранить превью.");
      return;
    }
    await refresh();
  }

  async function addMedia(project, file) {
    const src = await upload(file);
    const kind = file.type.includes("video") ? "video" : file.type.includes("gif") ? "gif" : "image";
    if (!(await patchProject(project.id, { mediaAppend: { kind, src, caption: "" } }))) {
      setStatus("Не удалось добавить медиа.");
      return;
    }
    await refresh();
  }

  async function updateAbout() {
    await fetch("/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(about)
    });
    await refresh();
    setStatus("Раздел «Обо мне» сохранен.");
  }

  const formMode = getProjectMode(form.tag);
  const sortedProjects = useMemo(() => projects, [projects]);

  return (
    <main className="adminRoot">
      <header className="adminTop">
        <div>
          <h1>Админка портфолио</h1>
          <p>Отдельный интерфейс на порту 3001. Публичный сайт без /admin.</p>
        </div>
        <a className="ghostLink" href="http://127.0.0.1:3000" target="_blank" rel="noreferrer">Открыть сайт</a>
      </header>

      <section className="adminCard">
        <div className="tokenRow">
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="ADMIN_TOKEN" />
          <button onClick={refresh} disabled={busy}>{busy ? "Загрузка..." : "Подключиться"}</button>
        </div>
        <div className={`status ${connected ? "ok" : "warn"}`}>{status}</div>
      </section>

      <section className="tabs">
        <button className={tab === "projects" ? "tab active" : "tab"} onClick={() => setTab("projects")}>Проекты</button>
        <button className={tab === "create" ? "tab active" : "tab"} onClick={() => setTab("create")}>Создать проект</button>
        <button className={tab === "about" ? "tab active" : "tab"} onClick={() => setTab("about")}>Обо мне</button>
      </section>

      {tab === "projects" && (
        <section className="adminCard">
          <h2>Проекты (порядок: перетащите за превью)</h2>
          <p className="muted">Кнопки «В архив», медиа и удаление не участвуют в перетаскивании.</p>
          <div className="projectList">
            {sortedProjects.map((project) => (
              <article
                key={project.id}
                className={`projectCard ${dragId === project.id ? "dragging" : ""}`}
                onClick={(e) => {
                  const target = e.target;
                  if (!(target instanceof HTMLElement)) return;
                  if (target.closest('[data-no-open="true"]')) return;
                  if (target.closest(".previewWrap")) return;
                  router.push(`/projects/${project.id}`);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const sourceId = e.dataTransfer.getData("text/plain");
                  if (!sourceId || sourceId === project.id) return;
                  const from = sortedProjects.findIndex((p) => p.id === sourceId);
                  const to = sortedProjects.findIndex((p) => p.id === project.id);
                  if (from < 0 || to < 0) return;
                  const next = moveInArray(sortedProjects, from, to);
                  setProjects(next);
                  await saveOrder(next.map((p) => p.id));
                  setStatus("Порядок проектов сохранен.");
                }}
              >
                <div
                  className="previewWrap"
                  draggable
                  title="Перетащите превью, чтобы поменять порядок проектов"
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDragId(project.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", project.id);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    setDragId(null);
                  }}
                >
                  <img src={project.preview} alt={project.title} className="preview" />
                </div>
                <div className="projectMeta">
                  <h3>{project.title}</h3>
                  <p>{project.tag}</p>
                  <div className="chipRow">
                    <span className={project.published ? "chip green" : "chip"}>{project.published ? "Опубликован" : "Черновик"}</span>
                    <span className={project.archived ? "chip red" : "chip"}>{project.archived ? "Архив" : "Активный"}</span>
                  </div>
                </div>
                <div className="projectActions" data-no-open="true">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleArchived(project);
                    }}
                  >
                    {project.archived ? "Вернуть" : "В архив"}
                  </button>
                  <label className="filePick" onMouseDown={(e) => e.stopPropagation()}>
                    Заменить превью
                    <input type="file" accept="image/*,video/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      await replacePreview(project, file);
                    }} />
                  </label>
                  <label className="filePick soft" onMouseDown={(e) => e.stopPropagation()}>
                    Добавить медиа
                    <input type="file" accept="image/*,video/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      await addMedia(project, file);
                    }} />
                  </label>
                  {project.published ? (
                    <button
                      type="button"
                      className="btnDeleteProject"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteProject(project);
                      }}
                    >
                      Удалить проект
                    </button>
                  ) : (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void togglePublished(project);
                      }}
                    >
                      Опубликовать
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "create" && (
        <section className="adminCard">
          <h2>Новый проект</h2>
          <form className="formGrid" onSubmit={onCreateProject}>
            <input placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
              {TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            {formMode === "identity" && (
              <>
                <textarea rows={5} placeholder="Rich text" value={form.richText} onChange={(e) => setForm({ ...form, richText: e.target.value })} />
                <textarea rows={4} placeholder="Блоки: Заголовок | Текст" value={form.structuredBlocksText} onChange={(e) => setForm({ ...form, structuredBlocksText: e.target.value })} />
              </>
            )}
            <label className="filePick">
              Choose preview
              <input type="file" accept="image/*,video/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await upload(file);
                setForm({ ...form, preview: url });
              }} />
            </label>
            <label className="filePick soft">
              Choose gallery files
              <input type="file" multiple accept="image/*,video/*" onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const urls = await Promise.all(files.map(upload));
                setInitialMedia(urls);
                setStatus(`Подготовлено файлов: ${urls.length}`);
              }} />
            </label>
            <button type="submit">Создать проект</button>
          </form>
        </section>
      )}

      {tab === "about" && (
        <section className="adminCard">
          <h2>Обо мне</h2>
          <div className="formGrid">
            <input value={about.title} onChange={(e) => setAbout({ ...about, title: e.target.value })} />
            <textarea rows={6} value={about.text} onChange={(e) => setAbout({ ...about, text: e.target.value })} />
            <label className="filePick soft">
              Добавить фото
              <input type="file" multiple accept="image/*" onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const urls = await Promise.all(files.map(upload));
                setAbout({ ...about, photos: [...about.photos, ...urls] });
              }} />
            </label>
            <button onClick={updateAbout}>Сохранить</button>
          </div>
        </section>
      )}
    </main>
  );
}
