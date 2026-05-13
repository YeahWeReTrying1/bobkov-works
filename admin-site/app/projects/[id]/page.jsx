"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function structuredBlocksToText(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return blocks.map((block) => `${block.title || ""} | ${block.text || ""}`).join("\n");
}

function getProjectMode(tag) {
  if (tag === "айдентика") return "identity";
  if (tag === "шрифты") return "fonts";
  if (tag === "зины и книги") return "books";
  return "gallery";
}

export default function AdminProjectEditorPage() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? params.id : "";

  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "change-me" : window.localStorage.getItem("admin_token") || "change-me"
  );
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("Загрузка проекта...");
  const [busy, setBusy] = useState(false);
  const [dragMediaId, setDragMediaId] = useState(null);

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  useEffect(() => {
    window.localStorage.setItem("admin_token", token);
  }, [token]);

  async function upload(file) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload error");
    return data.url;
  }

  async function patchProject(payload) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
  }

  async function loadProject() {
    if (!projectId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/projects?scope=all", { headers: authHeaders() });
      if (res.status === 401) {
        setStatus("Ошибка авторизации. Проверь ADMIN_TOKEN.");
        setDraft(null);
        return;
      }
      const data = await res.json();
      const project = (data.projects || []).find((item) => item.id === projectId);
      if (!project) {
        setDraft(null);
        setStatus("Проект не найден.");
        return;
      }
      setDraft({
        ...project,
        richText: project.richText || "",
        structuredBlocksText: structuredBlocksToText(project.structuredBlocks),
        media: [...(project.media || [])]
      });
      setStatus("Проект загружен.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/projects?scope=all", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (cancelled) return;
        if (res.status === 401) {
          setStatus("Ошибка авторизации. Проверь ADMIN_TOKEN.");
          setDraft(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const project = (data.projects || []).find((item) => item.id === projectId);
        if (!project) {
          setDraft(null);
          setStatus("Проект не найден.");
          return;
        }
        setDraft({
          ...project,
          richText: project.richText || "",
          structuredBlocksText: structuredBlocksToText(project.structuredBlocks),
          media: [...(project.media || [])]
        });
        setStatus("Проект загружен.");
      } catch {
        if (!cancelled) setStatus("Ошибка загрузки проекта.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, token]);

  const mode = useMemo(() => (draft ? getProjectMode(draft.tag) : "gallery"), [draft]);

  async function saveProject() {
    if (!draft) return;
    setBusy(true);
    try {
      const detailsEnabled = draft.tag === "айдентика" || draft.tag === "шрифты";
      await patchProject({
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        tag: draft.tag,
        preview: draft.preview,
        published: draft.published,
        archived: draft.archived,
        detailsEnabled,
        richText: detailsEnabled ? draft.richText : "",
        structuredBlocks: detailsEnabled ? parseStructuredBlocks(draft.structuredBlocksText || "") : [],
        media: draft.media
      });
      setStatus("Проект сохранен.");
      await loadProject();
    } finally {
      setBusy(false);
    }
  }

  async function replaceMediaItem(mediaId, file) {
    const src = await upload(file);
    const kind = file.type.includes("video") ? "video" : file.type.includes("gif") ? "gif" : "image";
    setDraft((prev) => ({
      ...prev,
      media: prev.media.map((item) => (item.id === mediaId ? { ...item, src, kind } : item))
    }));
    setStatus("Файл заменен в черновике. Не забудь нажать «Сохранить проект».");
  }

  function removeMediaItem(mediaId) {
    setDraft((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.id !== mediaId)
    }));
    setStatus("Файл удален из черновика. Не забудь нажать «Сохранить проект».");
  }

  async function addMedia(file) {
    const src = await upload(file);
    const kind = file.type.includes("video") ? "video" : file.type.includes("gif") ? "gif" : "image";
    setDraft((prev) => ({
      ...prev,
      media: [...prev.media, { id: crypto.randomUUID(), kind, src, caption: "" }]
    }));
    setStatus("Новое медиа добавлено. Не забудь нажать «Сохранить проект».");
  }

  function moveMedia(sourceId, targetId) {
    setDraft((prev) => {
      if (!prev) return prev;
      const from = prev.media.findIndex((item) => item.id === sourceId);
      const to = prev.media.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const nextMedia = [...prev.media];
      const [moved] = nextMedia.splice(from, 1);
      nextMedia.splice(to, 0, moved);
      return { ...prev, media: nextMedia };
    });
    setStatus("Порядок фото обновлен в черновике. Нажми «Сохранить проект».");
  }

  if (!draft) {
    return (
      <main className="adminRoot">
        <header className="adminTop">
          <div>
            <h1>Редактор проекта</h1>
            <p>{status}</p>
          </div>
          <Link className="ghostLink" href="/">← К списку проектов</Link>
        </header>
      </main>
    );
  }

  return (
    <main className="adminRoot">
      <header className="adminTop">
        <div>
          <h1>Редактор проекта</h1>
          <p>{draft.title}</p>
        </div>
        <Link className="ghostLink" href="/">← К списку проектов</Link>
      </header>

      <section className="adminCard">
        <div className="tokenRow">
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="ADMIN_TOKEN" />
          <button onClick={loadProject} disabled={busy}>{busy ? "Загрузка..." : "Обновить"}</button>
        </div>
        <div className="status ok">{status}</div>
      </section>

      <section className="adminCard projectEditorCard">
        <div className="formGrid">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Название" />
          <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="Slug" />
          <textarea rows={4} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Описание" />
          <select value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })}>
            {TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>

          {mode === "identity" ? (
            <>
              <textarea rows={6} placeholder="Rich text" value={draft.richText || ""} onChange={(e) => setDraft({ ...draft, richText: e.target.value })} />
              <textarea rows={5} placeholder="Блоки: Заголовок | Текст" value={draft.structuredBlocksText || ""} onChange={(e) => setDraft({ ...draft, structuredBlocksText: e.target.value })} />
            </>
          ) : null}

          <label className="filePick">
            Заменить превью
            <input
              type="file"
              accept="image/*,video/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const src = await upload(file);
                setBusy(true);
                try {
                  await patchProject({ preview: src });
                  setStatus("Превью проекта сохранено.");
                  await loadProject();
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>

        <div className="editorMediaList">
          <h3>Медиа проекта</h3>
          <label className="filePick soft">
            Добавить файл
            <input
              type="file"
              accept="image/*,video/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await addMedia(file);
              }}
            />
          </label>

          <div className="mediaRows">
            {draft.media.map((item, index) => (
              <article
                key={item.id}
                className={`mediaRow ${dragMediaId === item.id ? "dragging" : ""}`}
                draggable
                onDragStart={(e) => {
                  setDragMediaId(item.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", item.id);
                }}
                onDragEnd={() => setDragMediaId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const sourceId = e.dataTransfer.getData("text/plain");
                  if (!sourceId || sourceId === item.id) return;
                  moveMedia(sourceId, item.id);
                }}
              >
                <div className="mediaThumb">
                  {item.kind === "video" ? <video src={item.src} controls /> : <img src={item.src} alt={`media-${index + 1}`} />}
                </div>
                <div className="mediaEdit">
                  <p>#{index + 1} • {item.kind}</p>
                  <input
                    value={item.caption || ""}
                    placeholder="Подпись"
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        media: prev.media.map((m) => (m.id === item.id ? { ...m, caption: e.target.value } : m))
                      }))
                    }
                  />
                  <div className="mediaEditActions">
                    <label className="filePick soft">
                      Заменить файл
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await replaceMediaItem(item.id, file);
                        }}
                      />
                    </label>
                    <button type="button" className="dangerButtonInline" onClick={() => removeMediaItem(item.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="editorFooter">
          <button type="button" onClick={saveProject} disabled={busy}>{busy ? "Сохранение..." : "Сохранить проект"}</button>
        </div>
      </section>
    </main>
  );
}
